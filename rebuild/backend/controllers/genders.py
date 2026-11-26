from controllers.errors import handle_service_error
from services import genders


def get_genders():
    return handle_service_error(genders.get_genders)
