from repositories import sidos, sigungu


def get_sigungu(sido_cd=None):
    if sido_cd is not None and not sidos.sido_exists(sido_cd):
        raise ValueError(400, "존재하지 않는 시도 코드입니다.")
    return sigungu.get_sigungu(sido_cd)
