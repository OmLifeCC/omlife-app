# OmLife Desktop App — Build via GitHub (No Install Needed)

This builds your Windows `.exe` app automatically in the cloud. You don't
need to install Node.js, npm, or any command-line tool on your own laptop.

The app itself: a clean desktop window that opens **https://omlife.in/**,
with a Start Menu shortcut, taskbar icon, and installer — just like any
normal Windows program.

---

## Step 1 — Create a free GitHub account

Go to **https://github.com/signup** and sign up (just email + password,
like any website).

## Step 2 — Create a new repository

1. Once logged in, click the **+** icon (top right) → **New repository**
2. Name it `omlife-app`
3. Set it to **Private** (recommended, so the code isn't public) or Public — your choice
4. Leave everything else as default
5. Click **Create repository**

## Step 3 — Upload the project files

1. On your new repo's page, click **"uploading an existing file"** (a link
   shown on the empty repo page)
2. Unzip the `omlife-app.zip` folder I gave you, on your computer
3. Drag **all the files and folders** from inside `omlife-app` into the
   GitHub upload box (including the hidden `.github` folder — see note
   below if it doesn't show up)
4. Scroll down, click **Commit changes**

**Note on the `.github` folder:** some file explorers hide folders starting
with a dot. If you don't see it after unzipping, enable "Show hidden files"
in Windows File Explorer (View tab → tick "Hidden items"), or just tell me
and I'll give you the workflow file's content to paste in directly via
GitHub's web editor instead.

## Step 4 — Let it build (automatic, ~3-5 minutes)

1. Click the **Actions** tab at the top of your repo
2. You'll see a workflow run called "Build Windows App" already running
   (it starts automatically after upload)
3. Wait for the green checkmark ✅

## Step 5 — Download your .exe

1. Still on that same Actions run page, scroll down to **Artifacts**
2. Click **OmLife-Windows-Installer** to download a zip
3. Inside that zip is your installer, e.g. `OmLife Setup 1.0.0.exe`

**That's the file you install.** Double-click it on any Windows laptop —
OmLife installs like a normal app, Start Menu shortcut and all.

---

## Using your real logo instead of the placeholder

Right now the app icon is a placeholder purple "OL" square. To use your
real OmLife logo:

1. Get your logo as a square image, ideally 256x256px or larger
2. Convert it to `.ico` at a free site like https://icoconvert.com
3. On GitHub, go to the `build` folder in your repo, delete the old
   `icon.ico`, and upload the new one with the exact same filename
4. Commit the change — this automatically re-triggers a new build with your
   real logo baked in

---

## What this app does

- Opens omlife.in in a clean, chrome-less window (no browser bar)
- Links within omlife.in stay inside the app
- External links (social media, etc.) open in the normal browser instead
- Shows a friendly message if there's no internet connection
- Always loads the **live** website — any updates to your WordPress site
  show up immediately, no app update needed

## When you'd need to rebuild

Only if you want to change the app's icon, name, or window behavior. Normal
website content changes need no rebuild at all.
