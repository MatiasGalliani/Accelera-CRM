import logo from "@/assets/Accelera_logo.svg"

export default function LogoHeader() {
    return (
        <a href="/" className="absolute top-4 left-4">
            <img src={logo} alt="Logo" className="w-32" />
        </a>
    )
} 