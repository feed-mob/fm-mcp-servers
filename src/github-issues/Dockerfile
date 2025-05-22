FROM node:20-alpine

# 创建应用目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置环境变量（如果需要）
# ENV GITHUB_DEFAULT_OWNER=your-default-owner
# ENV GITHUB_DEFAULT_REPO=your-default-repo
# ENV SCORE_DB_URL=your-db-connection-string

# 暴露端口
EXPOSE 3002

# 启动应用
CMD ["npx", "tsx", "index.ts"]
