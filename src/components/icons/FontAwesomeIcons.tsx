"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHashtag,
  faCommentDots,
  faPlus,
  faChevronDown,
  faRightFromBracket,
  faXmark,
  faPaperPlane,
  faPen,
  faTrash,
  faHouse,
  faBell,
  faFolder,
  faEllipsis,
  faGear,
  faStar,
  faLock,
  faMagnifyingGlass,
  faUserGroup,
  faArrowLeft,
  faArrowRight,
  faClock,
  faList,
  faHeadphones,
  faBars,
  faBookmark,
  faPaperclip,
  faChevronUp,
  faCheck,
  faEnvelope,
  faThumbsUp,
  faHeart,
  faFaceSmile,
  faFire,
  faHandsClapping,
  faShare,
  faFile,
  faFileImage,
  faFileVideo,
  faFilePdf,
  faFileAudio,
  faDownload,
  faBellSlash,
  faImage,
  faReply,
} from "@fortawesome/free-solid-svg-icons";

const icons = {
  Hash: faHashtag,
  MessageCircle: faCommentDots,
  Plus: faPlus,
  ChevronDown: faChevronDown,
  LogOut: faRightFromBracket,
  X: faXmark,
  Send: faPaperPlane,
  Pencil: faPen,
  Trash2: faTrash,
  Home: faHouse,
  Bell: faBell,
  Folder: faFolder,
  Ellipsis: faEllipsis,
  Gear: faGear,
  Star: faStar,
  Lock: faLock,
  Search: faMagnifyingGlass,
  UserGroup: faUserGroup,
  ArrowLeft: faArrowLeft,
  ArrowRight: faArrowRight,
  Clock: faClock,
  List: faList,
  Headphones: faHeadphones,
  Bars: faBars,
  Bookmark: faBookmark,
  Paperclip: faPaperclip,
  ChevronUp: faChevronUp,
  Check: faCheck,
  Envelope: faEnvelope,
  ThumbsUp: faThumbsUp,
  Heart: faHeart,
  Smile: faFaceSmile,
  Fire: faFire,
  Clap: faHandsClapping,
  Share: faShare,
  File: faFile,
  FileImage: faFileImage,
  FileVideo: faFileVideo,
  FilePdf: faFilePdf,
  FileAudio: faFileAudio,
  Download: faDownload,
  BellSlash: faBellSlash,
  Image: faImage,
  Reply: faReply,
} as const;

type IconName = keyof typeof icons;

export type IconProps = {
  name: IconName;
  className?: string;
  title?: string;
};

export function Icon({ name, className, title }: IconProps) {
  return <FontAwesomeIcon icon={icons[name]} className={className} title={title} />;
}

export { icons };
