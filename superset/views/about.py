from .base import BaseSupersetView
from flask_appbuilder.api import expose
from superset import event_logger
from superset.superset_typing import FlaskResponse

class AboutView(BaseSupersetView):
    route_base = "/about"

    @event_logger.log_this
    @expose("/")
    def root(self) -> FlaskResponse:
        return super().render_app_template()