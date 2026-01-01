# Inference Economics

Compare the costs of running LLM inference on local hardware vs cloud GPU rental vs API providers.

**[Live Demo →](https://jharris1679.github.io/inference-economics)**

## Features

- **Local Hardware**: Mac Studio M3 Ultra (96GB–512GB), NVIDIA DGX Spark
- **Cloud GPU Rental**: RunPod, Denvr, Lambda, GCP, AWS (H100s)
- **API Providers**: Groq, Together.ai, Fireworks, DeepInfra
- **Models**: 7B, 13B, 34B, 70B, 405B parameter models
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

## Data Sources

### Benchmarks
- Mac throughput: llama.cpp discussions, MLX benchmarks (Q4_K_M quantization, batch=1)
- Cloud throughput: vLLM benchmarks, NVIDIA TensorRT-LLM, SemiAnalysis

### Pricing (December 2025)
- **GPU Rental**: RunPod $1.99, Denvr $2.10, Lambda $2.99, GCP $3.00, AWS $3.90 per H100/hr
- **API**: Groq, Together.ai, Fireworks, DeepInfra per-token pricing
- **Mac Studio**: Apple.ca CAD pricing converted at 0.72 USD/CAD

## Tech Stack

- [Astro](https://astro.build/) — Static site generator
- [React](https://react.dev/) — Interactive calculator component
- [Tailwind CSS](https://tailwindcss.com/) — Styling

## License

MIT
