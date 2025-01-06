const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// 1) Create exporter for traces 
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger-collector.default.svc.cluster.local:14250',
});

// 2) Create Node-SDK
//    service name is set by the environmental variables
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'default-service',
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

sdk.start()

// we start the SDK in this file that's why we only have to import it once 
const { trace } = require('@opentelemetry/api');
module.exports = {
  trace,
};