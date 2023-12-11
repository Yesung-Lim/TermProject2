const axios = require("axios");
const { ConvenienceTypes, HouseTypes, OrderTypes } = require("./types");

console.log("client is running...");

const getAvailableHouses = async (checkin, checkout, numOfGuest, houseType) => {
  try {
    const response = await axios.get("http://localhost:3000/house", {
      params: {
        checkin,
        checkout,
        numOfGuest,
        houseType,
        orderType: "PRICE",
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

    const houseDetail = response.data;
    console.log("숙소 기본 정보:");
    console.log(`이름: ${houseDetail.name}`);
    console.log(`타입: ${houseDetail.houseType}`);
    console.log(
      `주소: ${houseDetail.address.street}, ${houseDetail.address.city}`
    );
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

      console.log("일 월 화 수 목 금 토");

      const firstDayOfWeek = new Date(2023, month - 1, 1).getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        process.stdout.write("   ");
      }

      for (let i = 1; i <= daysInMonth; i++) {
        if (calendar[i - 1] === 1) {
          process.stdout.write(" O ");
        } else {
          process.stdout.write(" X ");
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

      console.log("일 월 화 수 목 금 토");

      const firstDayOfWeek = new Date(2023, month - 1, 1).getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        process.stdout.write("   ");
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const value = calendar[i - 1];
        process.stdout.write(` ${value} `);

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
      console.log("숙소명\t\t\t체크인\t\t\t\t체크아웃\t\t\t요금\t후기");

      data.reservations.forEach((reservation) => {
        console.log(
          `${reservation.house.name}\t${reservation.checkin}\t${
            reservation.checkout
          }\t${reservation.charge}\t${reservation.comment ? "O" : "X"}`
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

// getAvailableHouses("2023-11-20", "2023-11-25", 2, HouseTypes.PRIVATE);
// getHouseDetail("6576cffed5c0c9819047ce53", 11);
// bookHouse("6576cffed5c0c9819047ce45", "6576cffed5c0c9819047ce53","2023-11-01", "2023-11-05", 3);
// bookHouse("6576a2fce4175d5d4ec84685", "6576a2fce4175d5d4ec84696","2023-11-01", "2023-11-5", 7);
// cancelReserve("6576d18dd5c0c9819047cfa6");
getReservationHistory("6576d4ca8e0b00a6d8af57c0", "all");
// addComments("6576d4ca8e0b00a6d8af57c0", "6576d4ca8e0b00a6d8af57fb", 4, "good");
