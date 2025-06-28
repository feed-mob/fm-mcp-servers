FROM node:20-alpine

# 创建应用目录
WORKDIR /app

# 复制所有源代码
COPY . .

# 安装依赖并构建
RUN npm ci && npm run build

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["node", "dist/start-http.js"]
