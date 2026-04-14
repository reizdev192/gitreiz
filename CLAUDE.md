# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` or `npm run tauri dev`: Start the app in development mode with HMR.
- `npm run build` or `npm run tauri build`: Build the production executable for the current OS.
- `npm run preview`: Preview the production build (Vite).
- `tsc`: Run TypeScript type checking.

## System Architecture

ZenGit is a desktop Git management utility built with **Tauri v2**, **React 19**, and **Rust**.

### Frontend (React)
- **Framework**: React 19 with Vite and Tailwind CSS 4.
- **State Management**: **Zustand** for global application state (projects, configurations, custom actions).
- **Styling**: Tailwind CSS for UI components.
- **Components**: Modular React components in `src/components/`, managing specific Git functionalities like committing, stashing, and worktrees.
- **Hooks**: Custom hooks in `src/hooks/` for shared logic (keyboard shortcuts, auto-fetching).
- **Stores**:
  - `useProjectStore`: Manages the current active project and workspace state.
  - `useCustomActionsStore`: Handles user-defined custom automation scripts.
  - `useConfirmStore`: Centralized dialog/confirmation management.

### Backend (Rust/Tauri)
- **Core Logic**: Rust-based backend in `src-tauri/` handling performance-critical and OS-level Git operations.
- **Modules**:
  - `commands.rs`: Entry point for Tauri invoke handlers, bridging frontend requests to backend logic.
  - `git.rs`: Direct interaction with the Git CLI and repository management.
  - `config.rs`: Persistence of application settings and project data.
  - `stats.rs`: Analytics and heatmap generation from Git history.
  - `custom_actions.rs`: Execution engine for user-defined shell scripts and automation.
- **Encryption**: `crypto.rs` handles sensitive data (like passwords or tokens) using AES-GCM and PBKDF2.

### Key Workflows
- **Tauri Invokes**: The frontend calls backend commands using `@tauri-apps/api/core.invoke`.
- **Git Operations**: Most Git actions are executed via shell commands triggered by the Rust backend.
- **Custom Actions**: Users can build complex workflows in the UI, which are stored as YAML/JSON and executed as shell scripts by the backend.
