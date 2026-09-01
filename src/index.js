// 简单的 Worker：把所有请求转交给 Cloudflare 静态资源服务
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
