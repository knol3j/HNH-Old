# HashNHedge Deployment Scripts

This directory contains automation scripts for deploying and managing HashNHedge services.

## 📜 Available Scripts

### 🚀 Deployment Scripts

#### `deploy-railway.sh`
Automates deployment to Railway platform.

```bash
# Deploy to production
./scripts/deploy-railway.sh production

# Deploy to staging
./scripts/deploy-railway.sh staging
```

**Features:**
- ✅ Auto-installs Railway CLI if missing
- ✅ Generates secure secrets automatically
- ✅ Sets environment variables
- ✅ Triggers deployment
- ✅ Shows deployment logs

#### `start-with-migration.sh`
Starts the server with automatic database migration.

```bash
./scripts/start-with-migration.sh
```

**Use Cases:**
- Manual deployments requiring schema updates
- Development environments
- Docker containers

**What it does:**
1. Pushes Prisma schema to database
2. Continues even if migration fails
3. Starts the unified API server

---

### 🧪 Testing Scripts

#### `test-deployment.sh`
Comprehensive deployment health check.

```bash
# Test localhost
./scripts/test-deployment.sh

# Test production
./scripts/test-deployment.sh https://api.hashnhedge.com

# Test with custom URLs
./scripts/test-deployment.sh https://api.example.com https://pool.example.com
```

**Tests Performed:**
- ✅ Health endpoint responsiveness
- ✅ API endpoint availability
- ✅ JSON response validation
- ✅ Security (auth required endpoints)
- ✅ Response time monitoring

**Output:**
- Green ✅ = Test passed
- Red ❌ = Test failed
- Yellow ⚠️ = Warning
- Summary report at end

---

## 🔧 Usage Examples

### Deploy to Railway

```bash
# First time setup
npm install -g @railway/cli
railway login

# Deploy
./scripts/deploy-railway.sh production
```

### Test Local Development

```bash
# Start dev server
npm run dev:unified

# In another terminal, test it
./scripts/test-deployment.sh http://localhost:10000
```

### Test Production Deployment

```bash
# Test Render deployment
./scripts/test-deployment.sh https://hashnhedge-api.onrender.com

# Test Railway deployment
./scripts/test-deployment.sh https://hashnhedge.railway.app
```

### CI/CD Integration

```yaml
# In .github/workflows/deploy.yml
- name: Test deployment
  run: ./scripts/test-deployment.sh ${{ secrets.API_URL }}
```

---

## 🛠️ Script Development

### Adding New Scripts

1. Create script in this directory
2. Make it executable: `chmod +x script-name.sh`
3. Add documentation to this README
4. Test thoroughly before committing

### Script Template

```bash
#!/bin/bash
# Script description
# Usage: ./scripts/your-script.sh [args]

set -e  # Exit on error

# Your code here
echo "Script running..."
```

### Best Practices

- ✅ Always include `set -e` to exit on errors
- ✅ Use descriptive variable names
- ✅ Add usage comments at the top
- ✅ Provide user feedback with echo statements
- ✅ Use colors for important messages
- ✅ Handle errors gracefully
- ✅ Test on multiple environments

---

## 🔍 Troubleshooting

### Script Won't Execute

```bash
# Make sure it's executable
chmod +x scripts/script-name.sh

# Check for Windows line endings
dos2unix scripts/script-name.sh  # If needed
```

### Railway CLI Not Found

```bash
# Install globally
npm install -g @railway/cli

# Or use npx
npx @railway/cli up
```

### Permission Denied

```bash
# Run with bash explicitly
bash scripts/script-name.sh
```

### Database Connection Issues

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
railway run psql $DATABASE_URL
```

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🤝 Contributing

To add new deployment scripts:

1. Follow the template above
2. Test on staging first
3. Document in this README
4. Submit PR with description

---

**Last Updated:** December 3, 2025
**Maintained by:** HashNHedge Team
