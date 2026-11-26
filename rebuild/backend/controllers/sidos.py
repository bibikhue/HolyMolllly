from controllers.errors import handle_service_error
from services import sidos


def get_sidos():
    return handle_service_error(sidos.get_sidos)
