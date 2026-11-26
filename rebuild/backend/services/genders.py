from repositories import genders


def get_genders():
    result = genders.get_genders()
    if result is None:
        raise ValueError(501, "Not implemented")
    return result
