import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articulos = (await getCollection('articulos', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'devops.sergioizq.com',
    description: 'Tutoriales y comparativas de Docker, .NET, Angular y self-hosting en VPS.',
    site: context.site,
    items: articulos.map((articulo) => ({
      title: articulo.data.title,
      description: articulo.data.description,
      pubDate: articulo.data.pubDate,
      link: `/articulos/${articulo.slug}/`
    }))
  });
}
