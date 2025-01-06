const { Resource } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { trace } = require("@opentelemetry/api");
const { ExpressInstrumentation } = require("opentelemetry-instrumentation-express");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const {JaegerExporter} = require("@opentelemetry/exporter-jaeger")
const {JaegerPropagator} = require("@opentelemetry/propagator-jaeger")

module.exports = (serviceName) => {
    const provider = new NodeTracerProvider({resource: new Resource({
            [ATTR_SERVICE_NAME] : serviceName,
        }),
    });
    const exporter = new JaegerExporter({endpoint: "http://jaeger-collector.default.svc.cluster.local:14268/api/traces"});
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register({ propagator: new JaegerPropagator() });

    registerInstrumentations({
        instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
        tracerProvider: provider,
    });
    return trace.getTracer(serviceName);
};