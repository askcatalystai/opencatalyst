export class WebChatChannel {
  private widgetId: string;

  constructor(config: { widgetId?: string }) {
    this.widgetId = config.widgetId || "default";
  }

  getWidgetCode(gatewayUrl: string): string {
    return `<!-- OpenCatalyst Chat Widget -->
<script>
  (function(w, d, s) {
    var j = d.createElement(s);
    j.async = true;
    j.src = '${gatewayUrl}/widget.js';
    j.onload = function() {
      w.OpenCatalyst.init({ widgetId: '${this.widgetId}', gatewayUrl: '${gatewayUrl}' });
    };
    d.head.appendChild(j);
  })(window, document, 'script');
</script>`;
  }

  getWidgetConfig(): Record<string, unknown> {
    return { widgetId: this.widgetId };
  }
}
