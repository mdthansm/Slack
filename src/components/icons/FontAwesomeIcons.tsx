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
