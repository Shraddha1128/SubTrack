-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 21, 2025 at 11:53 AM
-- Server version: 8.0.27
-- PHP Version: 7.4.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `subtrack`
--

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userEmail` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `expiryDate` date NOT NULL,
  `status` varchar(50) NOT NULL,
  `addedDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `userEmail`, `name`, `price`, `expiryDate`, `status`, `addedDate`) VALUES
(17, 'shraddhavispute8@gmail.com', 'HotStar', '1000.00', '2025-10-18', 'Active', '2025-09-21 15:57:01'),
(19, 'shraddhavispute8@gmail.com', 'JioCinema', '1999.00', '2026-11-01', 'Active', '2025-09-21 16:41:06'),
(15, 'shraddhavispute8@gmail.com', 'Spotify', '499.00', '2025-09-25', 'Paused', '2025-09-21 15:17:26'),
(14, 'shraddhavispute8@gmail.com', 'YouTube', '899.00', '2025-11-29', 'Active', '2025-09-21 15:17:08'),
(18, 'shraddhavispute8@gmail.com', 'Netflix', '1009.00', '2025-09-19', 'Expiring Soon', '2025-09-21 15:57:08'),
(21, 'shraddhavispute8@gmail.com', 'JioTV', '2998.00', '2025-11-27', 'Active', '2025-09-21 17:15:14');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phnumber` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profile_pic` varchar(255) DEFAULT 'profile.png',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `phnumber`, `email`, `password`, `profile_pic`) VALUES
(6, 'Shraddha Manoj Vispute', '8483918931', 'shraddhavispute8@gmail.com', '$2b$10$PQiTpuI1NV0N8HaIIr1H8.4MAdOfS0zT90EDSgPalgKZxxncArfvK', '1758455174720.jpeg');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
