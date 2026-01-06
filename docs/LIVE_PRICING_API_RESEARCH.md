# Live Pricing API Research

**Date:** 2026-01-05
**Issue:** ANS-516

## Executive Summary

This document evaluates API integrations for fetching live pricing data from cloud GPU and inference API providers. Two providers offer comprehensive pricing APIs suitable for integration: **OpenRouter** and **Together AI**.

## API Availability Matrix

| Provider | Pricing API | Auth Required | Pricing in Response | Notes |
|----------|-------------|---------------|---------------------|-------|
| **OpenRouter** | `GET /api/v1/models` | No | Yes | Aggregates 400+ models from multiple providers |
| **Together AI** | `GET /v1/models` | Yes (API key) | Yes | Direct pricing for 200+ OSS models |
| **Groq** | `GET /openai/v1/models` | Yes | No | Model list only, pricing separate |
| **Fireworks** | `GET /v1/accounts/{id}/models` | Yes | No | Model metadata only |
| **DeepInfra** | OpenAI-compatible | Yes | No | Pricing on web only |
| **RunPod** | Billing API only | Yes | No | No public pricing endpoint |
| **Lambda Labs** | N/A | - | - | No public API found |

## Recommended Integrations

### 1. OpenRouter (Primary - Recommended)

**Endpoint:** `https://openrouter.ai/api/v1/models`
**Auth:** None required
**Rate Limit:** Reasonable for caching

**Response structure:**
```json
{
  "data": [{
    "id": "meta-llama/llama-3.1-70b-instruct",
    "name": "Llama 3.1 70B Instruct",
    "pricing": {
      "prompt": "0.00000052",
      "completion": "0.00000075",
      "image": "0",
      "request": "0"
    },
    "context_length": 131072,
    "architecture": { "modality": "text->text" }
  }]
}
```

**Advantages:**
- No authentication required
- Aggregates pricing from multiple providers (Together, Fireworks, DeepInfra, etc.)
- Single API call covers most OSS models
- Includes context length and capabilities

**Disadvantages:**
- 5.5% fee on top of provider pricing (but useful for comparison)
- May not reflect exact provider pricing

### 2. Together AI (Secondary)

**Endpoint:** `https://api.together.xyz/v1/models`
**Auth:** API key required (free tier available)

**Response structure:**
```json
{
  "id": "meta-llama/Llama-3.1-70B-Instruct-Turbo",
  "pricing": {
    "input": 0.88,
    "output": 0.88,
    "hourly": 0,
    "base": 0,
    "finetune": 0
  }
}
```

**Advantages:**
- Direct provider pricing (no markup)
- Comprehensive model catalog

**Disadvantages:**
- Requires API key
- Only Together's models

## Technical Implementation

### Caching Strategy

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│   Browser   │────>│  Edge Cache   │────>│  API Source  │
│             │<────│  (1hr TTL)    │<────│              │
└─────────────┘     └───────────────┘     └──────────────┘
                           │
                           v
                    ┌──────────────┐
                    │ Static JSON  │
                    │  (fallback)  │
                    └──────────────┘
```

- **Cache Duration:** 1 hour (pricing changes infrequently)
- **Fallback:** Static JSON data if API unavailable
- **CORS:** OpenRouter allows browser requests; Together requires proxy

### Data Normalization

All providers use different pricing formats. Normalize to:
```typescript
interface NormalizedPricing {
  modelId: string;
  provider: string;
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
  updatedAt: string;    // ISO timestamp
}
```

### Fallback Mechanism

```javascript
async function getApiPricing(modelId) {
  try {
    const live = await fetchLivePricing(modelId);
    return { ...live, source: 'live' };
  } catch (err) {
    console.warn('Live pricing unavailable, using static data');
    return { ...staticPricing[modelId], source: 'static' };
  }
}
```

## Cloud GPU Providers

GPU rental pricing APIs are more limited:

| Provider | API Available | Notes |
|----------|---------------|-------|
| RunPod | Billing only | No public pricing endpoint |
| Lambda | None | Pricing on website only |
| Vast.ai | Yes | Marketplace pricing, complex |
| AWS | Yes | Pricing API available but complex |
| GCP | Yes | Pricing API available but complex |

**Recommendation:** Continue using static JSON for GPU rental pricing, with manual updates. GPU pricing changes less frequently than API pricing.

## Implementation Priority

1. **Phase 1:** Integrate OpenRouter API (no auth, covers most models)
2. **Phase 2:** Add Together AI as secondary source (for direct pricing)
3. **Phase 3:** Evaluate AWS/GCP pricing APIs if needed

## POC Implementation

See `/src/lib/live-pricing.js` for proof-of-concept implementation with:
- OpenRouter API integration
- Together AI API integration
- Caching with fallback
- Data normalization

## References

- [OpenRouter API](https://openrouter.ai/api/v1/models)
- [OpenRouter Documentation](https://openrouter.ai/docs/guides/overview/models)
- [Together AI Models API](https://docs.together.ai/reference/models-1)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Fireworks Pricing](https://fireworks.ai/pricing)
- [Groq Pricing](https://groq.com/pricing)
- [DeepInfra Pricing](https://deepinfra.com/pricing)
