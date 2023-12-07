const express = require("express");
const router = express.Router();
const { Reservation } = require("../models/reservation");
const mongoose = require("mongoose");
const { Comment } = require("../models/comment");

router.post("/", async (req, res) => {
  console.log("요청이 도착했습니다:", req.body);
  try {
    const { guestId, reserveId, starPoint, comment } = req.body;

    // 예약 정보 가져오기
    const reservation = await Reservation.findById(reserveId);

    if (!reservation) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    // 예약한 사용자와 현재 요청한 사용자가 일치하는지 확인
    if (String(reservation.member) !== guestId) {
      return res.status(403).json({ message: "예약한 사용자가 아닙니다." });
    }
    // 현재 날짜와 체크아웃 날짜 비교
    const currentDate = new Date();
    const checkoutDate = new Date(reservation.checkout);

    if (currentDate < checkoutDate) {
      return res
        .status(400)
        .json({ message: "체크아웃 이후에 리뷰를 작성할 수 있습니다." });
    }

    // 이미 리뷰가 작성되었는지 확인
    if (reservation.comment) {
      console.log(reservation.comment);
      return res.status(400).json({ message: "이미 리뷰를 작성했습니다." });
    }

    // 리뷰 작성
    const newComment = new Comment({
      member: guestId,
      house: reservation.house,
      content: comment,
      score: starPoint,
    });

    const savedComment = await newComment.save();
    // 예약과 리뷰 연결
    reservation.comment = savedComment._id;
    await reservation.save();

    return res
      .status(201)
      .json({ message: "리뷰가 성공적으로 작성되었습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
