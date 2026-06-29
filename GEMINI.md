# 🚀 Unity Developer Guide - Antigravity Profile

Welcome to the **Unity Developer** profile. This document serves as the standard entry point and structural reference for all AI agent activities in this workspace.

---

## 📂 Standard Project Architecture

The codebase should follow a clean, decoupled Unity design pattern under the core project directory (e.g., `Assets/_Project/` or `Assets/Scripts/`):

- **`Scripts/`**: Contains the core codebase logic:
  - **`Characters/`** or **`Gameplay/`**: Handles player, AI/bot controllers, physics, and gameplay mechanics.
  - **`Manager/`**: Decoupled state managers and singletons handling flow.
  - **`UI/`**: UI panel controllers and view adapters.
  - **`SO/`**: ScriptableObjects defining configurations, constants, variables, or event channels.
  - **`Interface/`**: Decoupling interfaces (`IDamageable`, `IInteractable`, etc.).
  - **`Configs/`**: Gameplay configs and scriptable parameters.

---

## 🧠 AI Agent Configuration (Rules & Skills)

This project has been augmented with custom rules and skills located in the `.agent/` directory:

### 1. Passive Rules (Always Active)
*Located in: [.agent/rules/](.agent/rules)*
- **Karpathy Guidelines**: [karpathy-guidelines.md](.agent/rules/karpathy-guidelines.md) (Behavioral coding constraints, applied to every prompt).
- **Performance Guidelines**: [unity-performance.md](.agent/rules/unity-performance.md) (Rules to prevent GC allocation, cache components, and optimize hot-paths).
- **Unity Coding Standards**: [code-organization.md](.agent/rules/code-organization.md) & [unity-core.md](.agent/rules/unity-core.md) (Naming conventions, coupling guidelines, and structural design standards).
- **Unity Architecture**: [unity-architecture.md](.agent/rules/unity-architecture.md) (Base architecture rules).
- **Unity ECS & DOTS**: [unity-ecs.md](.agent/rules/unity-ecs.md) (DOTS, ECS, Job System, Burst, ISystem, IJobEntity).
- **Unity Input System**: [unity-input.md](.agent/rules/unity-input.md) (New Input System guidelines for Unity 6.2).
- **Unity Networking**: [unity-networking.md](.agent/rules/unity-networking.md) (Netcode for GameObjects, NetworkVariable, RPCs).
- **Unity Testing**: [unity-testing.md](.agent/rules/unity-testing.md) (Unity Test Framework, AAA pattern, Edit/Play mode tests).
- **Unity UI Toolkit**: [unity-ui.md](.agent/rules/unity-ui.md) (UI Toolkit rules, UXML/USS, MVC pattern, Data Binding).
- **Language - Vietnamese**: [language-vi.md](.agent/rules/language-vi.md) (Agent giao tiếp bằng tiếng Việt, code giữ tiếng Anh).

### 2. Active Skills (On-Demand Templates & Scripts)
*Located in: [.agent/skills/](.agent/skills)*

#### 🔧 00 - Core Engineering
- **Unity Compile Fixer**: [SKILL.md](.agent/skills/00-core-engineering/unity-compile-fixer/SKILL.md)
- **CoreCLR GC Watchdog**: [SKILL.md](.agent/skills/00-core-engineering/coreclr-gc-watchdog/SKILL.md)
- **C# 12 Features Guide**: [SKILL.md](.agent/skills/00-core-engineering/csharp12-features-guide/SKILL.md)
- **Unified Style Guide**: [SKILL.md](.agent/skills/00-core-engineering/unified-style-guide/SKILL.md)

#### 🧩 00 - Meta Skills
- **Project Scaffolder**: [SKILL.md](.agent/skills/00-meta-skills/project-scaffolder/SKILL.md)
- **Skill Creator**: [SKILL.md](.agent/skills/00-meta-skills/skill-creator/SKILL.md)
- **Virtual Production Lead**: [SKILL.md](.agent/skills/00-meta-skills/virtual-production-lead/SKILL.md)

#### 🏗 01 - Architecture
- **State Machine Architect (FSM)**: [SKILL.md](.agent/skills/01-architecture/state-machine-architect/SKILL.md)
- **Event Bus System**: [SKILL.md](.agent/skills/01-architecture/event-bus-system/SKILL.md)
- **Advanced Design Patterns**: [SKILL.md](.agent/skills/01-architecture/advanced-design-patterns/SKILL.md)
- **Advanced Game Bootstrapper**: [SKILL.md](.agent/skills/01-architecture/advanced-game-bootstrapper/SKILL.md)
- **Asynchronous Programming**: [SKILL.md](.agent/skills/01-architecture/asynchronous-programming/SKILL.md)
- **Command Pattern & Undo**: [SKILL.md](.agent/skills/01-architecture/command-pattern-undo/SKILL.md)
- **DI Container Manager**: [SKILL.md](.agent/skills/01-architecture/di-container-manager/SKILL.md)
- **DOTS System Architect**: [SKILL.md](.agent/skills/01-architecture/dots-system-architect/SKILL.md)
- **Interface-Driven Development**: [SKILL.md](.agent/skills/01-architecture/interface-driven-development/SKILL.md)
- **OOP Patterns Architect**: [SKILL.md](.agent/skills/01-architecture/oop-patterns-architect/SKILL.md)
- **Repository Pattern**: [SKILL.md](.agent/skills/01-architecture/repository-pattern/SKILL.md)
- **ScriptableObject Architecture**: [SKILL.md](.agent/skills/01-architecture/scriptableobject-architecture/SKILL.md)
- **Service Locator Pattern**: [SKILL.md](.agent/skills/01-architecture/service-locator-pattern/SKILL.md)

#### 🎮 02 - Gameplay
- **Advanced Character Controller**: [SKILL.md](.agent/skills/02-gameplay/advanced-character-controller/SKILL.md)
- **Ability & Skill System**: [SKILL.md](.agent/skills/02-gameplay/ability-skill-system/SKILL.md)
- **AI Behavior Trees**: [SKILL.md](.agent/skills/02-gameplay/ai-behavior-trees/SKILL.md)
- **Damage & Health Framework**: [SKILL.md](.agent/skills/02-gameplay/damage-health-framework/SKILL.md)
- **Day-Night Cycle**: [SKILL.md](.agent/skills/02-gameplay/day-night-cycle/SKILL.md)
- **Dialogue & Quest System**: [SKILL.md](.agent/skills/02-gameplay/dialogue-quest-system/SKILL.md)
- **Inventory & Crafting Logic**: [SKILL.md](.agent/skills/02-gameplay/inventory-crafting-logic/SKILL.md)
- **Loot & RNG Management**: [SKILL.md](.agent/skills/02-gameplay/loot-rng-management/SKILL.md)
- **Minimap System**: [SKILL.md](.agent/skills/02-gameplay/minimap-system/SKILL.md)
- **NavMesh Pathfinding**: [SKILL.md](.agent/skills/02-gameplay/navmesh-pathfinding/SKILL.md)
- **Physics Logic**: [SKILL.md](.agent/skills/02-gameplay/physics-logic/SKILL.md)
- **Procedural Generation**: [SKILL.md](.agent/skills/02-gameplay/procedural-generation/SKILL.md)
- **Replay System**: [SKILL.md](.agent/skills/02-gameplay/replay-system/SKILL.md)
- **Save/Load Serialization**: [SKILL.md](.agent/skills/02-gameplay/save-load-serialization/SKILL.md)
- **Status Effect System**: [SKILL.md](.agent/skills/02-gameplay/status-effect-system/SKILL.md)

#### 🗺 03 - Simulation & Strategy
- **Environment Hazard System**: [SKILL.md](.agent/skills/03-simulation-strategy/environment-hazard-system/SKILL.md)
- **Grid-Based Building System**: [SKILL.md](.agent/skills/03-simulation-strategy/grid-based-building-system/SKILL.md)
- **Horde & Wave Logic**: [SKILL.md](.agent/skills/03-simulation-strategy/horde-wave-logic/SKILL.md)
- **Resource Management System**: [SKILL.md](.agent/skills/03-simulation-strategy/resource-management-system/SKILL.md)
- **Tech Tree & Research**: [SKILL.md](.agent/skills/03-simulation-strategy/tech-tree-research/SKILL.md)
- **Unit & Population AI**: [SKILL.md](.agent/skills/03-simulation-strategy/unit-population-ai/SKILL.md)

#### 🎨 04 - Visuals & Audio
- **Audio Soundscape Architect**: [SKILL.md](.agent/skills/04-visuals-audio/audio-soundscape-architect/SKILL.md)
- **Cinemachine Specialist**: [SKILL.md](.agent/skills/04-visuals-audio/cinemachine-specialist/SKILL.md)
- **Dynamic Audio Mixers**: [SKILL.md](.agent/skills/04-visuals-audio/dynamic-audio-mixers/SKILL.md)
- **Juice & Game Feel**: [SKILL.md](.agent/skills/04-visuals-audio/juice-game-feel/SKILL.md)
- **Lighting & NavBaker**: [SKILL.md](.agent/skills/04-visuals-audio/lighting-nav-baker/SKILL.md)
- **Lighting & Post Processing**: [SKILL.md](.agent/skills/04-visuals-audio/lighting-post-processing/SKILL.md)
- **Procedural Animation & IK**: [SKILL.md](.agent/skills/04-visuals-audio/procedural-animation-ik/SKILL.md)
- **Shader Graph Expert**: [SKILL.md](.agent/skills/04-visuals-audio/shader-graph-expert/SKILL.md)
- **VFX Graph & Shuriken**: [SKILL.md](.agent/skills/04-visuals-audio/vfx-graph-shuriken/SKILL.md)

#### 🖥 05 - UI & UX
- **Accessibility & HCI**: [SKILL.md](.agent/skills/05-ui-ux/accessibility-hci/SKILL.md)
- **Canvas Performance**: [SKILL.md](.agent/skills/05-ui-ux/canvas-performance/SKILL.md)
- **Input System (New)**: [SKILL.md](.agent/skills/05-ui-ux/input-system-new/SKILL.md)
- **Menu Navigation Flow**: [SKILL.md](.agent/skills/05-ui-ux/menu-navigation-flow/SKILL.md)
- **MVVM Binding System**: [SKILL.md](.agent/skills/05-ui-ux/mvvm-binding-system/SKILL.md)
- **Responsive UI Design**: [SKILL.md](.agent/skills/05-ui-ux/responsive-ui-design/SKILL.md)
- **UI Toolkit Architect (Legacy)**: [SKILL.md](.agent/skills/05-ui-ux/ui-toolkit-architect-legacy/SKILL.md)
- **UI Toolkit Modern**: [SKILL.md](.agent/skills/05-ui-ux/ui-toolkit-modern/SKILL.md)

#### ⚡ 06 - Performance
- **Addressables Asset Management**: [SKILL.md](.agent/skills/06-performance/addressables-asset-management/SKILL.md)
- **GPU Instancing Expert**: [SKILL.md](.agent/skills/06-performance/gpu-instancing-expert/SKILL.md)
- **Job System & Burst**: [SKILL.md](.agent/skills/06-performance/job-system-burst/SKILL.md)
- **LOD & Occlusion Culling**: [SKILL.md](.agent/skills/06-performance/lod-occlusion-culling/SKILL.md)
- **Memory Profiler Expert**: [SKILL.md](.agent/skills/06-performance/memory-profiler-expert/SKILL.md)
- **Mobile Optimization**: [SKILL.md](.agent/skills/06-performance/mobile-optimization/SKILL.md)
- **Object Pooling System**: [SKILL.md](.agent/skills/06-performance/object-pooling-system/SKILL.md)
- **Texture Streaming Expert**: [SKILL.md](.agent/skills/06-performance/texture-streaming-expert/SKILL.md)

#### 🛠 07 - Tools & Pipeline
- **AI Code Reviewer**: [SKILL.md](.agent/skills/07-tools-pipeline/ai-code-reviewer/SKILL.md)
- **Asset Import Pipeline**: [SKILL.md](.agent/skills/07-tools-pipeline/asset-import-pipeline/SKILL.md)
- **Automated Unit Testing**: [SKILL.md](.agent/skills/07-tools-pipeline/automated-unit-testing/SKILL.md)
- **Context Discovery Agent**: [SKILL.md](.agent/skills/07-tools-pipeline/context-discovery-agent/SKILL.md)
- **Custom Editor Scripting**: [SKILL.md](.agent/skills/07-tools-pipeline/custom-editor-scripting/SKILL.md)
- **Localization Specialist**: [SKILL.md](.agent/skills/07-tools-pipeline/localization-specialist/SKILL.md)
- **Metadata Validator**: [SKILL.md](.agent/skills/07-tools-pipeline/metadata-validator/SKILL.md)
- **Unity MCP Connector**: [SKILL.md](.agent/skills/07-tools-pipeline/unity-mcp-connector/SKILL.md)
- **Version Control (Git)**: [SKILL.md](.agent/skills/07-tools-pipeline/version-control-git/SKILL.md)

#### 💰 08 - Backend & Monetization
- **Ads Mediation (IronSource)**: [SKILL.md](.agent/skills/08-backend-monetization/ads-mediation-ironsource/SKILL.md)
- **Analytics & Heatmaps**: [SKILL.md](.agent/skills/08-backend-monetization/analytics-heatmaps/SKILL.md)
- **Backend Integration**: [SKILL.md](.agent/skills/08-backend-monetization/backend-integration/SKILL.md)
- **Monetization & IAP**: [SKILL.md](.agent/skills/08-backend-monetization/monetization-iap/SKILL.md)
- **Multiplayer Netcode**: [SKILL.md](.agent/skills/08-backend-monetization/multiplayer-netcode/SKILL.md)
- **PlayFab Economy v2**: [SKILL.md](.agent/skills/08-backend-monetization/playfab-economy-v2/SKILL.md)
- **Service Layer Generator**: [SKILL.md](.agent/skills/08-backend-monetization/service-layer-generator/SKILL.md)
- **Unity Gaming Services**: [SKILL.md](.agent/skills/08-backend-monetization/unity-gaming-services/SKILL.md)

#### 🚀 09 - DevOps & Automation
- **Build Pipeline Manager**: [SKILL.md](.agent/skills/09-devops-automation/build-pipeline-manager/SKILL.md)
- **Unity Build Commander**: [SKILL.md](.agent/skills/09-devops-automation/unity-build-commander/SKILL.md)

### 3. Agents (Specialized Subagents)
*Located in: [.agent/agents/](.agent/agents)*
- **Performance Reviewer**: [performance-reviewer.md](.agent/agents/performance-reviewer.md) (Profiling, memory optimization, GC allocation detection).
- **Unity Bug Fixer**: [unity-bug-fixer.md](.agent/agents/unity-bug-fixer.md) (Resolve compilation errors, logic bugs, runtime exceptions).

### 4. Commands (Slash Commands)
*Located in: [.agent/commands/](.agent/commands)*
- **Compile Fix**: [compile-fix.md](.agent/commands/compile-fix.md) (Auto-fix Unity compilation errors).
- **Perf Check**: [perf-check.md](.agent/commands/perf-check.md) (Scan code for mobile performance bottlenecks).
- **Review**: [review.md](.agent/commands/review.md) (Code quality, style, and performance review).

---

## ⚡ Development & Performance Standards

To maintain game performance on mobile platforms:
1. **GC Allocations**: Avoid allocations in `Update()`, `FixedUpdate()`, or `LateUpdate()`. Do not use `LINQ` or string concatenation in frame-by-frame functions.
2. **Caching**: Cache references returned by `GetComponent` or `Find` in `Awake`/`Start`. Do not use them in frame loops.
3. **Physics**: Apply force/movement changes in `FixedUpdate` using rigidbodies or CharacterControllers, referring to the movement config scriptable objects.
4. **UI**: Keep UI components decoupled via events (avoid calling singleton gameplay controllers directly from UI where possible; use the `Interface` definitions).
