# 「排排看」部署配置

## 域名信息
- 主域名: www.shengkangyan.com
- 应用子域名: ppk.shengkangyan.com
- ICP备案号: 粤ICP备2026059171号

## 腾讯云服务器
- IP: <YOUR_SERVER_IP>
- 地域: 上海
- 登录: ubuntu / <YOUR_SSH_PASSWORD>
- Web环境: Apache 2
- 站点配置: /etc/apache2/sites-enabled/000-default.conf
- 网站根目录: /var/www/html
- DNS: 腾讯云 DNSPod (sara.dnspod.net, delphinus.dnspod.net)

## 腾讯云 API
- SecretId: <YOUR_TENCENT_SECRET_ID>
- SecretKey: <YOUR_TENCENT_SECRET_KEY>
- Region: ap-shanghai

## 微信支付
- 商户号: <YOUR_WECHAT_MCH_ID>
- 支付方式: H5 + Native（需AppID）/ 演示模式（当前）
- 通知回调: https://ppk.shengkangyan.com/api/payment/notify

## 环境变量
复制 `server/.env.example` 为 `server/.env` 并填入真实密钥。
确保 `server/.env` 已在 `.gitignore` 中忽略。

## 部署步骤

### 1. 上传代码到服务器
```bash
scp -r /Users/mac/Projects/pai_pai_kan ubuntu@<YOUR_SERVER_IP>:/home/ubuntu/
```

### 2. 服务器安装 Node.js
```bash
ssh ubuntu@<YOUR_SERVER_IP>
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. 设置环境变量
```bash
cd /home/ubuntu/pai_pai_kan/server
cp .env.example .env
vim .env  # 填入真实的密钥
```

### 4. 构建前端
```bash
cd /home/ubuntu/pai_pai_kan
npm install
npm run build
sudo cp -r dist/* /var/www/html/
```

### 5. 启动后端服务
```bash
cd /home/ubuntu/pai_pai_kan/server
npm install
npx prisma db push
pm2 start npm --name "pai-pai-kan" -- run start
pm2 save
pm2 startup
```

### 6. 配置 Apache 反向代理
```bash
sudo a2enmod proxy proxy_http
sudo systemctl restart apache2
```

Apache 配置 (/etc/apache2/sites-enabled/000-default.conf):
```apache
<VirtualHost *:80>
    ServerName ppk.shengkangyan.com
    
    # 前端静态文件
    DocumentRoot /var/www/html
    
    # API 反向代理
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api
    
    # 上传文件
    ProxyPass /uploads http://127.0.0.1:3001/uploads
    ProxyPassReverse /uploads http://127.0.0.1:3001/uploads
</VirtualHost>
```

### 7. 配置 SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d ppk.shengkangyan.com
```

## 待配置项
1. [ ] 微信开放平台 AppID（网页应用）
2. [ ] SSL 证书
3. [ ] 域名解析到服务器 IP

## 安全提醒
- **请勿**将 `server/.env`、`server/certs/` 目录提交到 Git
- **请勿**在代码仓库中存储任何 API 密钥、密码或证书
- 所有密钥应通过环境变量注入，本地开发使用 `.env`（已加入 .gitignore）
