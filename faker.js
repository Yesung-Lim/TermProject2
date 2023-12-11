const faker = require("faker");
const mongoose = require("mongoose");
const {
  Member,
  House,
  Reservation,
  Convenience,
  Comment,
  HouseCalendar,
} = require("./models");
const {
  OrderTypes,
  MemberTypes,
  HouseTypes,
  ConvenienceTypes,
} = require("./types");
const { checkout } = require("./routers/houseController");

const convenienceTypesArray = Object.values(ConvenienceTypes);

// 랜덤으로 카테고리 설정
const getRandomConvenienceTypes = (count) => {
  const selectedTypes = [];
  const remainIdx = [...Array(convenienceTypesArray.length).keys()];

  for (let i = 0; i < Math.min(count, convenienceTypesArray.length); i++) {
    const randomIdx = Math.floor(Math.random() * remainIdx.length);
    const selectedIndex = remainIdx[randomIdx];
    selectedTypes.push(convenienceTypesArray[selectedIndex]);

    // 선택한 항목의 인덱스를 remainIdx 배열에서 제거
    remainIdx.splice(randomIdx, 1);
  }
  return selectedTypes;
};

// 총 숙박 요금 계산 (금, 토, 일을 주말로 계산)
const calcCharge = (house, checkin, days) => {
  let totalCharge = 0;
  let checkinDay = checkin.getDay();
  for (let i = 0; i < days; i++, checkinDay++) {
    const day = checkinDay % 7;
    if (day > 4 || day === 0) totalCharge += house.charge.weekend;
    else totalCharge += house.charge.weekday;
  }

  return totalCharge;
};

const generateDummyData = async () => {
  const numOfGuest = 10;
  const numOfHost = 4;
  const numOfHouse = 10;
  const numOfReservation = 5;
  const houseName = [
    "산들바람 휴식공간",
    "에메랄드 하버 리트리트",
    "소나무 채우는 집",
    "해맞이 오션 레트릿",
    "푸른 언덕 하우스",
    "신비로운 숲속 쉼터",
    "물결 소리의 휴식장",
    "푸른 하늘의 뷰하우스",
    "동화 속 작은 집",
    "식물원 테라스 레지던스",
  ];

  const guests = [];
  const hosts = [];
  const houses = [];
  const comments = [];
  const conveniences = [];
  const reservations = [];
  const houseCalendar = [];
  const db = mongoose.connection.db;

  console.log("drop all collections");
  const collections = await db.listCollections().toArray();
  collections
    .map((collection) => collection.name)
    .forEach(async (collectionName) => {
      db.dropCollection(collectionName);
    });
  console.log("Generating Dummy data");

  // Guest 생성
  for (let i = 0; i < numOfGuest; i++) {
    guests.push(
      new Member({
        name: faker.internet.userName() + Math.round(Math.random() * 100),
        age: 20 + Math.round(Math.random() * 50),
        memberType: MemberTypes.GUEST,
      })
    );
  }

  // Host 생성
  for (let i = 0; i < numOfHost; i++) {
    hosts.push(
      new Member({
        name: faker.internet.userName() + Math.round(Math.random() * 100),
        age: 20 + Math.round(Math.random() * 50),
        memberType: MemberTypes.HOST,
      })
    );
  }

  // 각 Host마다 숙소 생성
  for (let i = 0; i < numOfHouse; i++) {
    const weekday = 20000 + Math.round(Math.random() * 1000) * 100;
    const capacity = 5 + Math.round(Math.random() * 5);

    houses.push(
      new House({
        name:
          houseName.length > i
            ? houseName[i]
            : faker.address.city() + " " + faker.address.streetName(),
        address: {
          city: faker.address.city(),
          street: faker.address.streetName(),
          zipCode: faker.address.zipCode(),
        },
        charge: {
          weekday,
          weekend: weekday + 10000,
        },
        member: hosts[Math.floor(Math.random() * numOfHost)],
        capacity,
        houseType: i < numOfHost / 2 ? HouseTypes.WHOLE : HouseTypes.PRIVATE,
        numOfBath: 1 + Math.round((Math.random() * capacity) / 2),
        avgScore: 0,
      })
    );
  }

  // 숙소의 카테고리 설정
  houses.map(async (house) => {
    const numOfConvenience = Math.round(Math.random() * 5);
    const newConvenience = new Convenience({
      house,
      category: getRandomConvenienceTypes(numOfConvenience),
    });
    conveniences.push(newConvenience);

    house.conveniences = newConvenience;
  });

  // 숙소 예약
  houses.map(async (house) => {
    const reserveDate = new Date();
    reserveDate.setUTCMonth(reserveDate.getUTCMonth() - 1);

    for (let i = 0; i < numOfReservation; i++) {
      const reserveDays = 1 + Math.round(Math.random() * 3);
      const checkinDate = new Date(reserveDate);
      checkinDate.setUTCHours(15, 0, 0);
      reserveDate.setUTCDate(reserveDate.getUTCDate() + reserveDays);
      const checkoutDate = new Date(reserveDate);
      checkoutDate.setUTCHours(11, 0, 0);
      const newReserve = new Reservation({
        member: guests[Math.round(Math.random() * (guests.length - 1))],
        house,
        checkin: checkinDate,
        checkout: checkoutDate,
        numOfGuest: 1 + Math.round(Math.random() * (house.capacity - 1)),
        charge: calcCharge(house, reserveDate, reserveDays),
      });
      reservations.push(
        new Reservation({
          member: guests[Math.round(Math.random() * (guests.length - 1))],
          house,
          checkin: checkinDate,
          checkout: checkoutDate,
          numOfGuest: 1 + Math.round(Math.random() * (house.capacity - 1)),
          charge: calcCharge(house, reserveDate, reserveDays),
        })
      );

      reserveDate.setUTCDate(
        reserveDate.getUTCDate() + Math.round(Math.random() * 3)
      );
    }
  });

  // 숙소 켈린더
  reservations.map(async (reservation) => {
    const startDate = new Date(reservation.checkin);
    while (startDate < reservation.checkout) {
      const newDate = new Date(startDate);
      houseCalendar.push(
        new HouseCalendar({
          house: reservation.house,
          date: newDate,
          remain:
            reservation.house.houseType === HouseTypes.PRIVATE
              ? reservation.house.capacity - reservation.numOfGuest
              : 0,
        })
      );
      startDate.setDate(startDate.getDate() + 1);
    }
  });

  // 리뷰 작성
  for (let i = 0; i < reservations.length; i++) {
    if (i % numOfReservation > Math.round(numOfReservation / 2 - 1)) continue;

    const newComment = new Comment({
      member: reservations[i].member,
      house: reservations[i].house,
      content: faker.lorem.sentence(),
      score: 1 + Math.round(Math.random() * 4),
    });
    comments.push(newComment);
    reservations[i].comment = newComment;
  }

  // 작성된 리뷰에 따라 각 숙소 별점 계산
  houses.map((house) => {
    let numOfComment = 0,
      totalScore = 0;

    comments.map((comment) => {
      if (comment.house === house) {
        numOfComment++;
        totalScore += comment.score;
      }
    });

    house.avgScore = totalScore / numOfComment;
  });

  await Member.insertMany(guests);
  await Member.insertMany(hosts);
  await House.insertMany(houses);
  await Convenience.insertMany(conveniences);
  await Reservation.insertMany(reservations);
  await HouseCalendar.insertMany(houseCalendar);
  await Comment.insertMany(comments);
  console.log("Complete inserting Dummy data");
};

module.exports = { generateDummyData };
