# Maa Pateshwari PYQ - Semester Question Papers Portal

Official academic portal and digital repository for undergraduate semester examination question papers (PYQs). Students can search, browse, view in-browser, and download past examination papers organized by Course, Academic Year, and Subject.

- **Primary Domain:** `https://MaaPateshwariPYQ.in`
- **Main Public Entry:** `index.html`
- **Administrator Portal:** `admin.html` (or `/admin/`)
- **Framework:** React 18 + TypeScript + Vite + Tailwind CSS

---

## 🚀 Quick Deployment Guide (GitHub Pages + GoDaddy Domain)

### Step 1: Upload / Push to GitHub
1. Create a public repository on GitHub (e.g. `MaaPateshwariPYQ` or `semesterpyq`).
2. Push your project files:
   ```bash
   git init
   git add .
   git commit -m "Deploy Maa Pateshwari PYQ Portal"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY_NAME.git
   git push -u origin main
   ```

---

### Step 2: Configure GitHub Pages (1-Click Setting)
1. Go to your GitHub repository in your web browser.
2. Click **Settings** (top tab) → in the left sidebar, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** Select **`GitHub Actions`** from the dropdown.
4. Go to the **Actions** tab at the top. The `Deploy to GitHub Pages` workflow will run and deploy the site automatically.

---

### Step 3: Connect Your GoDaddy Custom Domain (`MaaPateshwariPYQ.in`)

#### In GoDaddy DNS Management:
1. Log in to your GoDaddy account and go to **DNS Management** for `MaaPateshwariPYQ.in`.
2. Add the following **4 A Records** (pointing `@` to GitHub Pages IPs):
   - **Type:** `A` | **Name:** `@` | **Value:** `185.199.108.153` | **TTL:** 1 Hour
   - **Type:** `A` | **Name:** `@` | **Value:** `185.199.109.153` | **TTL:** 1 Hour
   - **Type:** `A` | **Name:** `@` | **Value:** `185.199.110.153` | **TTL:** 1 Hour
   - **Type:** `A` | **Name:** `@` | **Value:** `185.199.111.153` | **TTL:** 1 Hour
3. Add or update the **CNAME Record** for `www`:
   - **Type:** `CNAME` | **Name:** `www` | **Value:** `USERNAME.github.io` | **TTL:** 1 Hour
   *(Replace `USERNAME` with your GitHub username)*

#### In GitHub Repository Settings:
1. In your GitHub repository **Settings** > **Pages**:
2. Under **Custom domain**, enter `MaaPateshwariPYQ.in` and click **Save** (the repository already includes the `CNAME` file in `public/CNAME`).
3. Check the box for **Enforce HTTPS** once the SSL certificate finishes provisioning.

---

## ⚠️ Troubleshooting "Not Hosting" / Blank Page / DNS Errors

If your site is not hosting or showing an error after pushing to GitHub, check these 3 common causes:

### 1. Custom Domain DNS Not Set Up Yet (`Could not resolve host`)
- **Reason:** The file `public/CNAME` is configured with `MaaPateshwariPYQ.in`. GitHub Pages immediately redirects all visits (including your `USERNAME.github.io` URL) to `MaaPateshwariPYQ.in`. If you haven't yet added the 4 A records in GoDaddy DNS, the browser shows a DNS resolution error (`DNS_PROBE_FINISHED_NXDOMAIN`).
- **Immediate Fix to test on GitHub Pages first:**
  - Delete or rename `public/CNAME` (e.g., to `public/CNAME.bak`).
  - In GitHub repository **Settings** > **Pages**, delete the custom domain.
  - Your site will instantly host and load at `https://USERNAME.github.io/REPOSITORY_NAME/`.
  - Once you configure your GoDaddy DNS records (Step 3 above), you can restore `public/CNAME`.

### 2. Enable GitHub Actions Workflow Permissions
- Go to repository **Settings** → **Actions** → **General**.
- Scroll to **Workflow permissions**.
- Select **"Read and write permissions"** and click **Save**.
- Go to the **Actions** tab, click the latest workflow run, and click **Re-run all jobs**.

### 3. Choose the Right Pages Source in GitHub
In **Settings** > **Pages**:
- **Recommended:** Set **Source** to **`GitHub Actions`**. The workflow in `.github/workflows/deploy.yml` will automatically build with Vite and deploy `dist/`.
- **Alternative (No Actions):** Set **Source** to **`Deploy from a branch`**, select branch `main`, and select folder **`/docs`**. The repository's build script automatically outputs the compiled static site to `/docs`.

---

## 💻 Local Development & Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
