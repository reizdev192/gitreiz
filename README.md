# Tauri Deploy Tool

This is a developer utility built with Tauri and React to manage and automate Git tagging deployments.

## Prerequisites
- Node.js (v18+)
- Rust (v1.75+)
- Git

## Development
To start the app in development mode with Hot Module Replacement (HMR):
```bash
npx tauri dev
# or
npm run tauri dev
```

## Building for Production
To build the application executable for your current OS:
```bash
npx tauri build
# or
npm run tauri build
```
The compiled binaries will be placed in `src-tauri/target/release/bundle`.

### Cross-Platform Compilation
Tauri bundles the application natively for the operating system it is compiled on. 

**For Windows (`.msi`, `.exe`)**
- Compile on a Windows machine.
- Requires MSVC C++ Build Tools.
```bash
npm run tauri build
```

**For macOS (`.app`, `.dmg`)**
- Compile on a Mac.
- Requires Xcode Command Line Tools.
```bash
npm run tauri build
```

**For Linux (`.deb`, `.AppImage`)**
- Compile on a Linux machine (Ubuntu/Debian recommended).
- Requires Webkit2GTK and base build packages (`build-essential`, `libwebkit2gtk-4.0-dev`).
```bash
npm run tauri build
```
