export const FAQ_CATEGORIES = [
  {
    id: "common",
    label: "공통",
    sections: [
      {
        id: "service-data",
        title: "서비스와 데이터 이용",
        questions: [
          {
            id: "service",
            question: "이 사이트는 어떤 서비스인가요?",
            answer:
              "부산의 외국인 관광과 관련된 방문, 소비, 관광 정보를 살펴볼 수 있는 대시보드입니다.",
          },
          {
            id: "assistant",
            question: "관광 데이터 도우미에게 어떤 질문을 할 수 있나요?",
            answer:
              "사이트에서 제공하는 부산 관광 정보와 데이터에 관해 질문할 수 있습니다. 답변은 참고용으로 확인해 주세요.",
          },
          {
            id: "no-answer",
            question:
              "도우미가 정보를 찾지 못하거나 답변하지 못하면 어떻게 하나요?",
            answer:
              "질문의 지역, 기간, 주제를 더 구체적으로 적어 다시 질문해 주세요. 답변에 필요한 정보가 제공되지 않을 수도 있습니다.",
          },
        ],
      },
    ],
  },
  { id: "prospective", label: "부산시 관계자", sections: [] },
  { id: "local", label: "소상공인", sections: [] },
  { id: "visitor", label: "외국인 방문객", sections: [] },
];
