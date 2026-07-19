---
title: "CQRS con MediatR en .NET: la arquitectura que uso en producción"
description: "Comandos, queries, el patrón Result en vez de excepciones para control de flujo, y cómo evito reescribir el mismo CRUD en cada entidad nueva."
pubDate: 2026-07-16
categoria: "dotnet"
tags: ["dotnet", "cqrs", "mediatr", "arquitectura"]
---

CQRS (Command Query Responsibility Segregation) sin más contexto suena a sobre-ingeniería para un proyecto pequeño. En la práctica, lo que realmente aporta valor no es la separación teórica de lecturas/escrituras, sino dos cosas muy concretas: **un patrón para no repetir el mismo CRUD 20 veces**, y **un `Result` en vez de excepciones para representar fallos de negocio**.

## Comandos y queries como mensajes, no como métodos

Cada operación es una clase (o record) que describe *qué* quieres hacer, y un handler separado que sabe *cómo* hacerlo:

```csharp
public sealed record CreatePlanHostingCommand : IRequest<Result<Guid>>
{
    public required string Proveedor { get; init; }
    public required decimal PrecioMensual { get; init; }
    // ...
}

public sealed class CreatePlanHostingCommandHandler
    : IRequestHandler<CreatePlanHostingCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreatePlanHostingCommand command, CancellationToken ct)
    {
        var entidad = PlanHosting.Create(command.Proveedor, command.PrecioMensual /* ... */);
        _repositorio.Add(entidad);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Success(entidad.Id.Value);
    }
}
```

El controller no sabe nada de EF Core ni de reglas de negocio — solo envía el comando y traduce el resultado a HTTP:

```csharp
[HttpPost]
public Task<IActionResult> Create(CreatePlanHostingCommand command, CancellationToken ct) =>
    SendAndHandleAsync(command, ct);
```

## `Result<T>` en vez de lanzar excepciones para fallos esperables

Una excepción debería significar "algo que no debería pasar, pasó" (fallo de conexión, bug). Un email duplicado o un recurso que no existe **no son excepcionales** — son parte del flujo normal de una API, y modelarlos como tal evita el antipatrón de usar `try/catch` como control de flujo:

```csharp
public class Result
{
    public bool IsSuccess { get; }
    public Error Error { get; }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
}
```

El controller mapea el tipo de error al código HTTP correcto de forma centralizada:

```csharp
private IActionResult HandleFailure(Error error) => error.Type switch
{
    ErrorType.Validation => BadRequest(error),
    ErrorType.NotFound => NotFound(error),
    ErrorType.Conflict => Conflict(error),
    _ => StatusCode(500, error)
};
```

Ni un `throw new NotFoundException(...)` ni un `catch` en cada controller — el error es un valor que fluye igual que cualquier otro dato.

## El problema real que resuelve esto: dejar de reescribir el mismo CRUD

Crear, actualizar, borrar, listar paginado, buscar por id — la lógica de estas cinco operaciones es prácticamente idéntica para cualquier entidad simple. En vez de copiar y pegar el mismo handler cambiando el nombre de la clase, uso handlers **abstractos** con Template Method: la clase base resuelve el flujo completo (cargar entidad, guardar, invalidar caché, manejar errores) y cada entidad concreta solo implementa el "hueco" específico:

```csharp
public sealed class CreatePlanHostingCommandHandler
    : AbsCreateCommandHandler<PlanHosting, PlanHostingId, CreatePlanHostingCommand>
{
    protected override PlanHosting CreateEntity(CreatePlanHostingCommand command, Dictionary<string, object>? deps) =>
        PlanHosting.Create(command.Proveedor, command.NombrePlan /* ... */);
}
```

Ese único método (`CreateEntity`) es todo lo que hace falta escribir; validación, persistencia, invalidación de caché y manejo de excepciones de base de datos viven en la clase base y se heredan gratis. Multiplicado por Update/Delete/GetById/GetPagedList, es la diferencia entre ~200 líneas y ~20 líneas por entidad nueva.

## Cuándo NO merece la pena

Si tu API tiene 2-3 endpoints y no va a crecer, MediatR + Result es capa de más. El punto de inflexión es cuando empiezas a repetir el mismo patrón de "cargar → validar → mutar → guardar → invalidar caché" en la tercera o cuarta entidad — ahí es donde la plantilla abstracta empieza a ahorrar más de lo que cuesta entenderla.
