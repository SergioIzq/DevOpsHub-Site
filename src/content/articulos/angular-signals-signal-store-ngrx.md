---
title: "Angular Signals y NgRx Signal Store: cómo dejé de escribir el mismo store 15 veces"
description: "Qué cambia realmente Signals frente a RxJS/NgRx clásico, y cómo un signalStoreFeature reutilizable eliminó el CRUD repetido en Kash."
pubDate: 2026-07-17
categoria: "angular"
tags: ["angular", "signals", "ngrx", "state-management"]
---

Kash tiene más de una docena de entidades tipo catálogo (categorías, clientes, proveedores, cuentas...) con exactamente el mismo comportamiento: cargar paginado, buscar, crear con actualización optimista, borrar con rollback si falla. La primera versión tenía ese código copiado y pegado 12 veces. Signals + NgRx Signal Store fue lo que permitió reducirlo a una sola implementación reutilizable.

## Qué aporta Signals frente a RxJS "a pelo"

Un signal es un contenedor de estado reactivo síncrono: lo lees llamándolo como función (`count()`), lo escribes con `.set()`/`.update()`, y Angular sabe automáticamente qué se re-renderiza sin `async pipe` ni suscripciones manuales que desuscribir:

```typescript
const count = signal(0);
const doubled = computed(() => count() * 2);

count.set(5); // doubled() ahora es 10, sin suscripción explícita
```

Para estado de UI local esto ya es una mejora frente a `BehaviorSubject` — pero donde de verdad cambia las cosas es combinado con `@ngrx/signals` para stores compartidos entre componentes.

## Un store como composición de "features" reutilizables

`signalStore` no es una clase que heredas — es una función que compones a partir de piezas (`withState`, `withComputed`, `withMethods`). Eso permite extraer el comportamiento común de un CRUD tipo catálogo en una función reutilizable:

```typescript
export function withCrudStore<T extends CrudEntity, Svc>(adapter: CrudServiceAdapter<T, Svc>) {
  return signalStoreFeature(
    withState<CrudStoreState<T>>(initialCrudState<T>()),
    withMethods((store) => {
      const svc = inject(adapter.service);
      return {
        loadPaginated: rxMethod<PaginatedQuery>(/* ... */),
        remove: rxMethod<string>(/* ... con rollback optimista ... */),
        // ...
      };
    })
  );
}
```

Cada entidad concreta solo aporta el "adapter" — qué servicio inyectar y cómo se llaman sus métodos de API:

```typescript
export const CategoriaStore = signalStore(
  { providedIn: 'root' },
  withCrudStore<Categoria, CategoriaService>({
    service: CategoriaService,
    load: (svc, q) => svc.getCategorias(q.page, q.pageSize, q.searchTerm),
    remove: (svc, id) => svc.delete(id)
    // ...
  })
);
```

12 stores casi idénticos se convirtieron en 12 configuraciones de 6 líneas cada una, más una única implementación del comportamiento real.

## Actualización optimista con rollback, sin librerías extra

El patrón que más repito: al borrar, quito el elemento de la lista *antes* de que la petición HTTP termine (la UI se siente instantánea), y si el servidor responde con error, lo devuelvo a su sitio:

```typescript
remove: rxMethod<string>(
  pipe(
    switchMap((id) => {
      const removido = store.items().find((e) => e.id === id);
      patchState(store, (s) => ({ items: s.items.filter((e) => e.id !== id) }));

      return adapter.remove(svc, id).pipe(
        tapResponse({
          next: () => {},
          error: () => {
            if (removido) patchState(store, (s) => ({ items: [...s.items, removido] }));
          }
        })
      );
    })
  )
)
```

Sin esto, cada borrado se siente con un pequeño lag mientras esperas la respuesta del servidor — con actualización optimista, la UI reacciona en el mismo frame y solo "retrocede" en el caso raro de que falle.

## Cuándo NO merece la pena la abstracción

Si solo tienes 1 o 2 entidades tipo catálogo, escribe el store directo — la capa de composición genérica solo paga cuando el mismo patrón se repite lo suficiente como para que copiar y pegar empiece a doler de verdad (para mí, a partir de la tercera entidad casi idéntica).
