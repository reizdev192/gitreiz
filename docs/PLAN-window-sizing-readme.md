# PLAN-window-sizing-readme

## Task Breakdown
1. **Window Sizing & Constraints (Tauri)**
   - Update `tauri.conf.json` -> `tauri.windows[0]`
   - Set `width` and `height` to optimally fit the current UI (approx 800x600).
   - Set `minWidth` and `minHeight` to the same values so the window cannot be shrunk below the optimal viewing size.
   - Ensure `resizable` is true so users can expand it if they want.
2. **Auto-fill Project Name (React)**
   - Update `ConfigForm.tsx` where `@tauri-apps/plugin-dialog` is used to select a folder (`handleSelectFolder`).
   - Parse the selected string path (e.g. `C:\Users\John\Projects\MyAwesomeApp`) to extract the last folder name (`MyAwesomeApp`).
   - Automatically put this folder name into the `name` field of `formData` if the `name` field is currently empty.
3. **Documentation (README)**
   - Create a `README.md` in the `tauri-deploy` directory.
   - Add instructions on how to run the app in dev mode (`npx tauri dev`).
   - Add instructions on how to build the app for the current OS (`npx tauri build`).
   - Mention cross-platform compilation commands/targets (Windows target, MacOS target, Linux target) and requirements (e.g. Rust, Node.js, MSVC/Xcode/build-essential).

## Agent Assignments
- **Orchestrator**: Oversee execution.
- **Frontend Specialist**: Implement React auto-fill logic in `ConfigForm.tsx`.
- **Backend Specialist / App Builder**: Update `tauri.conf.json` for window constraints and author the `README.md` guide.

## Verification Checklist
- [ ] Test resizing the window during `npx tauri dev`; it should not shrink below the configured min width/height.
- [ ] Select a repository folder in the "Create New Project" form; verify the project name field auto-fills with the folder name.
- [ ] Verify `README.md` exists and contains correct markdown build instructions.
