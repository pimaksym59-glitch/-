# PUBLIC_CONTRACT_REGISTRY.md — Stable Public Contract Registry (Stages 1–20)

Consolidated registry of every **Stable Public Contract** in the project. Per-stage detail lives in each
`STAGE<N>_REPORT.md §Публичные контракты`. "Internal" contracts (fakes/helpers) are omitted here. No contract
changed in Stage 20.

---

## Infrastructure (Stages 1–11)

- **Config (2):** `Settings`, `get_settings`, `to_safe_dict`; config-first parameters (§Appendix B).
- **Persistence (4):** ORM models (25 tables), `Base`, async session/engine; repositories
  (`Channel/Post/Image/Memory/Task/Schedule` repositories) with typed query methods.
- **Redis (5):** `RedisManager`, `KeyBuilder`, TTL registry, `Cache`, `IdempotencyStore`, `RateLimiter`,
  `DistributedLock`, `PubSub`.
- **Task Queue (8):** `HandlerRegistry`, `TaskProducer`, `TaskDispatcher`, `TaskExecutor`, `Worker`, retry/
  backoff/DLQ; `Metrics`/`EventLogger` hooks.
- **Scheduler (9):** timing (DST/cron/weekly), `AdvisoryLock`, scanner, `SlotMaterializer`, runner;
  `ScheduleRepository`, `TaskRepository.existing_dedup_keys`.
- **API (10):** `create_app` factory, lifespan, DI deps, unified Error Schema handlers, `Page[T]` pagination,
  health live/ready; `Principal`/`Authenticator` auth seam.
- **Providers (11):** `Provider`/`ProviderKind`/`Capability`, `ProviderRegistry`, `ProviderFactory`, error
  model (`ProviderError`/`AuthenticationError`/`RateLimitError`/`TimeoutError`/`TemporaryProviderError`/
  `PermanentProviderError`/`UnsupportedCapabilityError`); per-kind Protocols `LLMProvider`/`EmbeddingProvider`/
  `ImageProvider`/`TelegramProvider`; `get_llm|embedding|image|telegram|metrics_provider(settings)`.

## Engines & subsystems (Stages 12–18)

- **AI Engine (12):** `AIEngine`, `GenerationRequest`/`GenerationResult`/`PromptSpec`, `ProviderSelector`/
  `ModelRouter`, `StructuredOutputParser`, `OutputValidator` Protocol, `generate_with_fallback`.
- **Memory/RAG (13):** RAG kernel (`ProviderEmbedder`, `SemanticBlockChunker`, store Protocols, channel
  filters, retrieval/ranking/assembly, `KnowledgeRetriever`); Memory (`MemoryStore`, `MemoryRetriever`,
  `MemoryScope`/`MemoryEntry`/`StyleFeatures`); `build_memory_source`/`build_knowledge_source`/
  `build_ai_engine_with_rag`.
- **Validation (14):** `ValidationEngine`, `Severity`/`Finding`/`ValidationReport`, `Rule` Protocol +
  `RuleContext`, `QualityGatePolicy`, `RewriteDecision`, dedup/humanization/persona/policy;
  `_OutputValidatorAdapter`/`build_ai_engine_with_validation`.
- **Image Engine (15):** `ImageEngine`, `AspectRatio`, `SceneDescriptor`/`ImageSpec`/`ImageRequest`/
  `GeneratedImage`, `SizePolicy`, `PromptEnhancer`, `SafetyLayer`, `ImageValidator`, postprocess
  (`ThumbnailStage`/`PhashStage`), `should_regenerate`.
- **Telegram Engine (16):** `TelegramEngine`, immutable DTOs (`Update`/`IncomingMessage`/`PublishRequest`/
  `SessionContext`/`RouteRule`), `map_update`, `UpdateSource`/`WebhookSource`/`PollingSource`, `Router`,
  `HandlerRegistry`, `Command/Callback/Message` handler Protocols, `Dispatcher`, `StateStore`, formatter,
  `AttachmentPipeline`, `RateLimiter`, `IdempotencyGuard`, `ErrorRecoveryPipeline`, `PublishService`,
  `MessagingPlatform`.
- **Analytics (17):** `Clock`/`IdFactory`, `Event`/taxonomy/`EventRegistry`, `EventCollector`/`EventDispatcher`/
  `AnalyticsPipeline`, `SamplingStrategy`, metrics (`Counter`/`Timer`/`Histogram`/`MetricRegistry`/
  `MetricsAggregator`), `CorrelationId`, `Tracer`, `AuditEvent`/`AuditPipeline`, `ObservabilityHook`,
  export Protocols + seams, `RetentionStrategy`, `AnalyticsEngine`.
- **Admin (18):** `AdminApi` (delegation facade), `Role`/`Permission`/`PERMISSION_MATRIX`, `Authenticator`/
  `PasswordAuthenticator`, `RbacAuthorization`, `SessionManager`/`Session`, `CsrfStrategy`, management
  services (`UserService`/`ChannelService`/`PromptService`/`ProviderService`/`ConfigService`),
  `FeatureFlagService`, dashboards (`HealthDashboard`/`MetricsDashboard`/`AnalyticsDashboard`/
  `JobMonitorService`/`ErrorReportService`), `AiStudioService`, pagination/filtering/search, DTO mapping,
  observability hooks; store/integration ports; Web UI/SSO seams.

## Test infrastructure (Stage 19, outside `app/`)

`SeedManager`, `SeededGenerator`, factories, fixtures, `FakeCatalogue`, `TestPyramid`/`TestLevel`,
`ProtocolConformance`, `PipelineOrchestrator`, nine strategies (`Snapshot`/`Property`/`Mutation`/`Performance`/
`Concurrency`/`Stress`/`Chaos`/`Compatibility`/`Regression`), `InMemoryTestReporter`, `CoveragePolicy`,
CI/CD + distributed seams.

## Stage 20

No new code contracts. Publishes this registry + `ARCHITECTURE_MAP.md`/`DEPENDENCY_MAP.md`. All contracts
above remain **Stable** and unchanged.
