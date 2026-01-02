# Inference Economics

Compare the costs of running LLM inference on local hardware vs cloud GPU rental vs API providers.

**[Live Demo →](https://jharris1679.github.io/inference-economics)**

A decision-making tool for compute purchases. Demand for AI compute is growing faster than supply, and these markets are becoming more complex. The goal is to help developers make informed decisions using real benchmark data rather than vibes and vendor marketing. See [VISION.md](VISION.md) for more on where this is heading.

## Features

- **Local Hardware**: Mac Studio M3 Ultra (96GB–512GB), NVIDIA DGX Spark
- **Cloud GPU Rental**: RunPod, Denvr, Lambda, GCP, AWS (H100s)
- **API Providers**: Groq, Together.ai, Fireworks, DeepInfra, OpenAI, Moonshot
- **Models by Developer**:
  - **OpenAI**: gpt-oss-20b, gpt-oss-120b
  - **Meta**: Llama 3.1 8B, 70B, 405B
  - **DeepSeek**: DeepSeek Coder 33B, DeepSeek V3
  - **Alibaba**: Qwen2.5 7B, 32B, 72B
  - **Moonshot**: Kimi K2
  - **Defog**: SQLCoder 7B, 34B, 70B
- **Calculations**: Daily/monthly costs, payoff period for hardware investment

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deploy to GitHub Pages

1. Fork/clone this repository
2. Update `astro.config.mjs`:
   - Change `site` to your GitHub Pages URL
   - Change `base` to your repository name
3. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions
4. Push to `main` branch — deployment is automatic

## Benchmark Sources

All benchmarks use Q4_K_M quantization (unless noted), batch size 1, decode speed for interactive use.

| Source | Description |
|--------|-------------|
| [llama.cpp M-series Discussion](https://github.com/ggml-org/llama.cpp/discussions/4167) | Apple Silicon benchmarks |
| [llama.cpp DGX Spark Discussion](https://github.com/ggml-org/llama.cpp/discussions/16578) | NVIDIA DGX Spark benchmarks |
| [dlewis.io H100 Evaluation](https://dlewis.io/evaluating-llama-33-70b-inference-h100-a100/) | Llama 3.3 70B on H100 vs A100 |
| [VALDI H100 Docs](https://docs.valdi.ai/llms/performance/gpu/H100/llama3.1-inference-testing/) | Llama 3.1 inference testing |
| [Hardware Corner DeepSeek](https://www.hardware-corner.net/studio-m3-ultra-running-deepseek-v3/) | DeepSeek V3 on Mac Studio |
| [MacRumors DeepSeek R1](https://www.macrumors.com/2025/03/17/apples-m3-ultra-runs-deepseek-r1-efficiently/) | DeepSeek R1 on M3 Ultra |
| [NVIDIA gpt-oss Blog](https://blogs.nvidia.com/blog/rtx-ai-garage-openai-oss/) | gpt-oss acceleration |
| [OpenAI gpt-oss Intro](https://openai.com/index/introducing-gpt-oss/) | gpt-oss model specs |
| [Moonshot Kimi K2](https://moonshotai.github.io/Kimi-K2/) | Kimi K2 specifications |

## Pricing Data (January 2026)

### GPU Rental (per H100/hr)
- RunPod: $1.99
- Denvr: $2.10
- Lambda: $2.99
- GCP: $3.00
- AWS: $3.90

### Hardware
- Mac Studio M3 Ultra: Apple.ca CAD pricing converted at 0.72 USD/CAD
- NVIDIA DGX Spark: $3,999 USD

## Tech Stack

- [Astro](https://astro.build/) — Static site generator
- [React](https://react.dev/) — Interactive calculator component
- [Tailwind CSS](https://tailwindcss.com/) — Styling

## Architecture

```
src/
├── components/
│   └── PayoffCalculator.jsx    # Main interactive component
├── data/
│   ├── models.json             # Model specs by developer
│   ├── hardware.json           # Hardware pricing
│   ├── cloud-providers.json    # GPU rental pricing
│   └── api-providers.json      # API pricing by model
├── lib/
│   └── calculations.js         # Pure calculation functions
└── pages/
    └── index.astro             # Main page
```

## Contributing

Corrections and updates welcome! The data in this tool will get stale as prices change and new hardware ships. Please open an issue or PR if you spot outdated information.

## License

MIT
