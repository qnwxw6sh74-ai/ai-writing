module.exports = {
  apps: [
    {
      name: "ai-writing",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/www/wwwroot/w.wyrunwu.com",
      env: {
        NODE_ENV: "production",
        NODE_OPTIONS: "--max-old-space-size=192",
      },
    },
  ],
}
