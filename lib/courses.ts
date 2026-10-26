export interface Course {
  id: number;
  image: string;
  imageAlt: string;
  status: "open" | "full";
  seatsLeft?: number;
  title: string;
  date: string;
  location: string;
  seats: string;
  warningMessage?: string;
}

export const DEFAULT_COURSE_ID = 2;

export const courses: Course[] = [
  {
    id: 1,
    image: "/assets/course-national-coach.png",
    imageAlt: "National Coach - รูปประกอบหลักสูตร",
    status: "open",
    seatsLeft: 12,
    title: "หลักสูตรผู้ฝึกสอนกีฬาระดับชาติ (National Coach)",
    date: "15-20 พ.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ต้องมีใบประกอบวิชาชีพในระดับสากล",
  },
  {
    id: 2,
    image: "/assets/course-professional-referee.png",
    imageAlt: "Professional Referee - รูปประกอบหลักสูตร",
    status: "open",
    seatsLeft: 24,
    title: "หลักสูตรผู้ตัดสินกีฬาอาชีพ (Professional Referee)",
    date: "18-22 พ.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ยังมีข้อมูลผู้ฝึกสอนไม่ครบถ้วน",
  },
  {
    id: 3,
    image: "/assets/course-basic-sports-science.png",
    imageAlt: "Basic Sports Science - รูปประกอบหลักสูตร",
    status: "full",
    title: "วิทยาศาสตร์การกีฬาขั้นพื้นฐาน (Basic Sports Science)",
    date: "1-5 ส.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
  },
  {
    id: 4,
    image: "/assets/course-sports-management.png",
    imageAlt: "Sports Management - รูปประกอบหลักสูตร",
    status: "open",
    seatsLeft: 5,
    title: "หลักสูตรการจัดการองค์การกีฬา (Sports Management)",
    date: "8-12 ส.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
  },
  {
    id: 5,
    image: "/assets/course-sports-psychology.png",
    imageAlt: "Sports Psychology - รูปประกอบหลักสูตร",
    status: "open",
    seatsLeft: 30,
    title: "จิตวิทยาการกีฬาสำหรับผู้ฝึกสอน (Sports Psychology)",
    date: "14-18 ต.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
  },
];

export function getCourseById(
  id: string | number | null | undefined,
  courseList: Course[] = courses
): Course | undefined {
  if (id === null || id === undefined || id === "") return undefined;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return undefined;
  return courseList.find((course) => course.id === numericId);
}

export function getDefaultCourse(courseList: Course[] = courses): Course {
  return (
    courseList.find((course) => course.id === DEFAULT_COURSE_ID) ??
    courseList[0]
  );
}
