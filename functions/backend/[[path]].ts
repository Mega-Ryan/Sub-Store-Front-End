// Binding types are generated from Wrangler configuration by "pnpm run types:cloudflare".
export const onRequest: PagesFunction<Cloudflare.Env> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname !== '/backend' && !url.pathname.startsWith('/backend/')) {
    return Response.json({ status: 'failed', error: { code: 'NOT_FOUND', message: 'API 路径不存在' } }, { status: 404 });
  }
  url.pathname = url.pathname.slice('/backend'.length) || '/';
  try {
    return await context.env.SUB_STORE.fetch(new Request(url, context.request));
  } catch {
    return Response.json({ status: 'failed', error: { code: 'BACKEND_UNAVAILABLE', message: '后端暂时不可用，请稍后重试' } }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
};

