const express = require("express");
const router = express.Router();
const { Reservation } = require("../models/reservation");
const { House } = require("../models/house");
const mongoose = require("mongoose");
const { HouseCalendar } = require("../models/houseCalendar");
// 총 금액 계산
const calculateCharge = (checkin, checkout, weekdayRate, weekendRate) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const days = Math.round(Math.abs((checkout - checkin) / oneDay));

  let totalCharge = 0;
  let currentDate = new Date(checkin);

  for (let i = 0; i < days; i++) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // 금토일

    if (isWeekend) {
      totalCharge += weekendRate;
    } else {
      totalCharge += weekdayRate;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return totalCharge;
};
// 예약 등록
router.post("/", async (req, res) => {
  const { guestId, houseId, checkinDate, checkoutDate, capacity } = req.body;

  try {
    const houseDetails = await House.findById(houseId);
    if (!houseDetails) {
      return res
        .status(404)
        .json({ message: "숙소를 찾을 수 없습니다." }, houseDetails);
    }

    const weekdayRate = houseDetails.charge.weekday;
    const weekendRate = houseDetails.charge.weekend;

    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);

    const totalCharge = calculateCharge(
      checkin,
      checkout,
      weekdayRate,
      weekendRate
    );
    const houseType = houseDetails.houseType;

    const reservation = new Reservation({
      member: guestId,
      house: houseId,
      checkin: checkin,
      checkout: checkout,
      numOfGuest: capacity,
      charge: totalCharge,
    });
    let remainCapacity = 0;

    if (houseType === "PRIVATE") {
      remainCapacity = houseDetails.capacity - capacity;
    }

    const dates = [];
    let currentDate = new Date(checkin);
    while (currentDate <= checkout) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of dates) {
      let houseCalendar = await HouseCalendar.findOne({ house: houseId, date });

      if (!houseCalendar) {
        houseCalendar = new HouseCalendar({
          house: houseId,
          date: date,
          remain: remainCapacity,
        });
      } else {
        if (houseType === "PRIVATE") {
          houseCalendar.remain -= capacity;
        }
      }

      await houseCalendar.save();
    }
    await reservation.save();
    res.status(200).json({ message: "예약 성공", reservation });
  } catch (err) {
    res.status(500).json({ message: "예약 실패", error: err.message });
  }
});
// 예약 취소
router.delete("/cancle", async (req, res) => {
  const reservationId = req.query.reservationId;
  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }

    const { house, checkin, checkout, numOfGuest } = reservation;
    const houseDetails = await House.findById(house);
    await Reservation.findByIdAndDelete(reservationId);

    const dates = [];
    let currentDate = new Date(checkin);

    while (currentDate <= checkout) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of dates) {
      let houseCalendar;

      if (houseDetails.houseType === "PRIVATE") {
        houseCalendar = await HouseCalendar.findOne({ house: house, date });
        if (houseCalendar) {
          houseCalendar.remain += numOfGuest;
          await houseCalendar.save();
          if (houseCalendar.remain === houseDetails.capacity) {
            await HouseCalendar.findOneAndDelete({ house: house, date });
          }
        }
      } else if (houseDetails.houseType === "WHOLE") {
        await HouseCalendar.findOneAndDelete({ house: house, date });
      }
    }

    res.status(200).json({ message: "예약이 취소되었습니다." });
  } catch (err) {
    res.status(500).json({ message: "예약 취소 실패", error: err.message });
  }
});
router.get("/", async (req, res) => {
  const { guestId, findType } = req.query;
  console.log(req.query);
  try {
    let reservations;
    let totalCount;
    const currentDate = new Date();
    switch (findType) {
      case "all":
        reservations = await Reservation.find({ member: guestId })
          .populate("house")
          .sort({ checkin: -1 }); // 체크인 날짜 기준으로 내림차순 정렬
        totalCount = await Reservation.countDocuments({ member: guestId });
        break;
      case "oncoming":
        reservations = await Reservation.find({
          member: guestId,
          checkout: { $lt: currentDate },
        })
          .populate("house")
          .sort({ checkin: -1 }); // 체크인 날짜 기준으로 내림차순 정렬
        totalCount = await Reservation.countDocuments({
          member: guestId,
          checkin: { $lt: new Date() },
        });
        break;
      case "terminated":
        reservations = await Reservation.find({
          member: guestId,
          checkin: { $gt: new Date() },
        })
          .populate("house")
          .sort({ checkin: -1 }); // 체크인 날짜 기준으로 내림차순 정렬
        totalCount = await Reservation.countDocuments({
          member: guestId,
          checkin: { $gt: new Date() },
        });
        break;
      default:
        return res
          .status(400)
          .json({ message: "올바르지 않은 findType입니다." });
    }

    res.status(200).json({ totalCount, reservations });
  } catch (err) {
    res.status(500).json({ message: "예약 조회 실패", error: err.message });
  }
});
module.exports = router;
