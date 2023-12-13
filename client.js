const axios = require("axios");
const { ConvenienceTypes, HouseTypes, OrderTypes } = require("./types");

console.log("client is running...");

const getAvailableHouses = async (
  checkin,
  checkout,
  numOfGuest,
  houseType,
  orderType
) => {
  try {
    const response = await axios.get("http://localhost:3000/house", {
      params: {
        checkin,
        checkout,
        numOfGuest,
        houseType,
        orderType,
      },
    });

    const availableHouses = response.data;
    console.log("검색 결과:");
    availableHouses.forEach((house) => {
      console.log(`숙소 타입: ${house.houseType}`);
      console.log(`숙소 이름: ${house.name}`);
      console.log(`총 가격: ${house.totalCharge}`);
      console.log(`평균 별점: ${house.avgScore}`);
      console.log("=====================");
    });
  } catch (error) {
    console.error("에러:", error.message);
  }
};
const getHouseDetail = async (houseId, month) => {
  try {
    const response = await axios.get("http://localhost:3000/house/detail", {
      params: {
        houseId,
        month,
      },
    });
    //console.log(response.data);
    const houseDetail = response.data;
    console.log("숙소 정보:");
    console.log(`이름: ${houseDetail.name}`);
    console.log(`타입: ${houseDetail.houseType}`);
    console.log(
      `주소: ${houseDetail.address.city}, ${houseDetail.address.street}, ${houseDetail.address.zipCode}`
    );
    console.log(
      `요금: ${houseDetail.charge.weekday}(주중), ${houseDetail.charge.weekend}(주말)`
    );
    console.log(`수용 가능 인원: ${houseDetail.capacity}`);
    console.log(`화장실 개수: ${houseDetail.numOfBath}`);
    console.log(`평균 별점: ${houseDetail.avgScore}`);
    console.log(`편의시설: ${houseDetail.conveniences.category.join(", ")}`);
    console.log("=====================");
    console.log("숙소 리뷰 정보:");

    if (houseDetail.comments && houseDetail.comments.length > 0) {
      houseDetail.comments.forEach((comment) => {
        console.log(`작성자: ${comment.member.name}`);
        console.log(`별점: ${comment.score}`);
        console.log(`리뷰 내용: ${comment.content}`);
        console.log("=====================");
      });
    } else {
      console.log("리뷰가 없습니다.");
      console.log("=====================");
    }

    console.log(`${month} 예약 현황:`);
    const reservationResponse = await axios.get(
      `http://localhost:3000/house/detail?houseId=${houseId}&month=${month}`
    );
    houseCalendar = reservationResponse.data.houseCalendar;

    if (houseDetail.houseType == "WHOLE") {
      daysInMonth = new Date(2023, month, 0).getDate();
      calendar = Array.from({ length: daysInMonth }, (_, i) => 0);

      houseCalendar.forEach((reservation) => {
        const reservationDate = new Date(reservation.date).getDate();
        calendar[reservationDate - 1] = 1;
      });

      console.log(
        "     일      월       화       수       목      금       토"
      );

      const firstDayOfWeek = new Date(2023, month - 1, 1).getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        process.stdout.write("         ");
      }

      for (let i = 1; i <= daysInMonth; i++) {
        if (calendar[i - 1] === 1) {
          process.stdout.write(`${i < 10 ? `  ${i}일` : ` ${i}일`}(O) `);
        } else {
          process.stdout.write(`${i < 10 ? `  ${i}일` : ` ${i}일`}(*) `);
        }
        if ((firstDayOfWeek + i) % 7 === 0) {
          console.log("");
        }
      }
    } else {
      daysInMonth = new Date(2023, month, 0).getDate();
      calendar = Array.from(
        { length: daysInMonth },
        (_, i) => houseDetail.capacity
      );

      houseCalendar.forEach((reservation) => {
        const reservationDate = new Date(reservation.date).getDate();
        calendar[reservationDate - 1] = reservation.remain;
      });

      console.log(
        "     일      월       화      수       목       금       토"
      );

      const firstDayOfWeek = new Date(2023, month - 1, 1).getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        process.stdout.write("         ");
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const value = calendar[i - 1];
        process.stdout.write(`${i < 10 ? `  ${i}일` : ` ${i}일`}(${value}) `);

        if ((firstDayOfWeek + i) % 7 === 0) {
          console.log("");
        }
      }
    }

    console.log("");
  } catch (error) {
    console.error("에러 발생:", error.message);
  }
};
const bookHouse = async (
  guestId,
  houseId,
  checkinDate,
  checkoutDate,
  capacity
) => {
  try {
    const response = await axios.post("http://localhost:3000/reservation", {
      guestId,
      houseId,
      checkinDate,
      checkoutDate,
      capacity,
    });

    const reservation = response.data.reservation;
    console.log("예약 성공:");
    console.log("체크인: ", reservation.checkin);
    console.log("체크아웃: ", reservation.checkout);
    console.log("인원: ", reservation.numOfGuest);
    console.log("총 가격: ", reservation.charge);
  } catch (error) {
    console.error("에러 발생:", error.message);
  }
};
const cancelReserve = async (reservationId) => {
  try {
    const response = await axios.delete(
      `http://localhost:3000/reservation/cancle?reservationId=${reservationId}`
    );
    if (response.status === 200) {
      console.log("예약이 취소되었습니다.");
    } else {
      console.log("예약 취소 실패:", response.data.message);
    }
  } catch (error) {
    console.error("에러 발생:", error.message);
  }
};
const getReservationHistory = async (guestId, findType) => {
  try {
    const response = await fetch(
      `http://localhost:3000/reservation?guestId=${guestId}&findType=${findType}`
    );
    const data = await response.json();

    if (response.ok) {
      console.log("[숙박 완료 리스트]");
      const title = "숙소명";
      const checkin = "체크인";
      const checkout = "체크아웃";
      const charge = "요금";
      const review = "후기";

      console.log(
        `${title.padStart()}${checkin.padStart(21)}${checkout.padStart(
          30
        )}${charge.padStart(30)}${review.padStart(10)}`
      );

      data.reservations.forEach((reservation) => {
        console.log(
          `${reservation.house.name.padStart()}\t${reservation.checkin.padStart(
            10
          )}\t${reservation.checkout.padStart(10)}\t${reservation.charge
            .toString()
            .padStart(10)}\t${reservation.comment ? "O" : "X"}`
        );
      });
    } else {
      console.error("예약 내역 조회 실패:", data.message);
    }
  } catch (error) {
    console.error("예약 내역 조회 중 에러 발생:", error.message);
  }
};
const addComments = async (guestId, reserveId, starPoint, comment) => {
  try {
    // 게스트의 전체 예약 조회
    const response = await fetch(
      `http://localhost:3000/reservation?guestId=${guestId}&findType=all`
    );
    const data = await response.json();

    if (!response.ok) {
      console.error("예약 정보를 가져오는데 실패했습니다:", data.message);
      return;
    }

    const reservation = data.reservations.find((res) => res._id === reserveId);

    if (!reservation) {
      console.error("해당 예약을 찾을 수 없습니다.");
      return;
    }

    if (reservation.comment) {
      console.error("이미 후기가 등록되었습니다.");
      return;
    }

    const reviewResponse = await fetch(`http://localhost:3000/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guestId,
        reserveId,
        starPoint,
        comment,
      }),
    });

    const reviewData = await reviewResponse.json();

    if (reviewResponse.ok) {
      console.log("후기 등록 성공:", reviewData);
    } else {
      console.error("후기 등록 실패:", reviewData.message);
    }
  } catch (error) {
    console.error("후기 등록 중 에러 발생:", error.message);
  }
};

const check3 = async (guestId, wholeHouse, privateHouse) => {
  getReservationHistory(guestId, "all");
  console.log(
    "------------------------------------------------- 예약 진행 -------------------------------------------------"
  );
  await Promise.all([
    bookHouse(guestId, wholeHouse, "2023-11-01", "2023-11-05", 1),
    bookHouse(guestId, privateHouse, "2023-11-01", "2023-11-05", 1),
  ]);
  console.log(
    "------------------------------------------------- 예약 완료 -------------------------------------------------"
  );
  getReservationHistory(guestId, "all");
};

const check4 = async (guestId, privateHouse, reserveId) => {
  await Promise.all([
    getReservationHistory(guestId, "all"),
    getHouseDetail(privateHouse, 11),
  ]);
  console.log(
    "------------------------------------------------ 예약 취소 진행 ------------------------------------------------"
  );
  await cancelReserve(reserveId);
  console.log(
    "------------------------------------------------ 예약 취소 완료 ------------------------------------------------"
  );
  await Promise.all([
    getReservationHistory(guestId, "all"),
    getHouseDetail(privateHouse, 11),
  ]);
};

const check6 = async (
  guestId,
  wholeHouse,
  wholeReserveId,
  starPoint,
  comment
) => {
  await getHouseDetail(wholeHouse, 11);
  console.log(
    "------------------------------------------------- 리뷰 작성 -------------------------------------------------"
  );
  await addComments(guestId, wholeReserveId, starPoint, comment);
  console.log(
    "------------------------------------------------- 작성 완료 -------------------------------------------------"
  );
  getHouseDetail(wholeHouse, 11);
};

// 검사항목 1
// getAvailableHouses("2023-11-20", "2023-11-25", 2, HouseTypes.PRIVATE, OrderTypes.PRICE);

const guestId = "65796cc070d23386c4dd309f";
const wholeHouse = "65796cc070d23386c4dd30ae";
const privateHouse = "65796cc070d23386c4dd30b2";

// 검사항목 2
// getHouseDetail(wholeHouse, 11);

// 검사항목 3 & 5
// check3(guestId, wholeHouse, privateHouse);

const wholeReserveId = "65796cf170d23386c4dd31cd"; // 위에서 예약한 것 중, 전체 예약 ID
const privateReserveId = "65796cf270d23386c4dd31e1"; // 위에서 예약한 것 중, 개인실 예약 ID

// 검사항목 4 & 5
// check4(guestId, privateHouse, privateReserveId);

// 검사항목 6
// check6(guestId, wholeHouse, wholeReserveId, 4, "아주 아주 아주 좋습니다");
