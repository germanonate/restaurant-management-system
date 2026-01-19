# Architecture & Design Decisions

## Approach
Given the 4-hour time constraint, I leveraged AI-assisted development 
(Claude Code - Opus 4.5) to accelerate implementation while focusing on:
- Architectural design and component structure
- Core algorithm implementation (conflict detection, drag-and-drop logic)
- Performance optimization strategies
- State management design

## Tech Stack Choices
- **React + TypeScript**: Type safety and component reusability
- **Vite**: Fast dev server and optimized builds
- **Zustand**: Lightweight state management, easier than Redux for time constraint
- **@dnd-kit**: Modern, accessible drag-and-drop library
- **shadcn/ui**: Pre-built accessible components to save time
- **date-fns**: Lightweight date utilities

## Key Design Decisions
1. **Custom Timeline Grid** vs library: Built from scratch for full control...
2. **State Management**: Zustand for simplicity...
3. **Rendering Strategy**: CSS Grid + absolute positioning...
4. **Conflict Detection Algorithm**: ...