// import { ImageCarousel } from "@/components/ImageCarousel";
import TopNavbar from "@/components/topNavbar";
import React, { JSX } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, TrendingUp, Wallet, Receipt, Link2, BarChart2 } from "lucide-react";

// Type definitions
interface FeatureItem {
  title: string;
  description: string;
}

interface FooterLink {
  label: string;
  href: string;
}

const Home: React.FC = (): JSX.Element => {
  // Feature items data
  const features: FeatureItem[] = [
    {
      title: "Enhance Transparency & Accountability:",
      description:
        "Foster trust among members and stakeholders with clear, accessible data.",
    },
    {
      title: "Drive Profitability:",
      description:
        "Optimize operations from input procurement to final sale, maximizing returns for members",
    },
    {
      title: "Financial Management:",
      description:
        "Simplify your FPO's financial management with easy-to-use tools for tracking payments, receivables, expenses, and member share capital.",
    },
    {
      title: "Transaction Management:",
      description:
        "Manage transactions transparently, generate accurate financial statements (like Balance Sheets, P&L), and gain a clear understanding of your organization's financial health.",
    },
    {
      title: "Market Connections:",
      description:
        "Facilitate better connections between your FPO's output and potential buyers, unlocking improved market opportunities and prices.",
    },
    {
      title: "Data-Driven Decision Making:",
      description:
        "Leverage real-time analytics to make informed strategic decisions for your FPO's growth and sustainability.",
    },
  ];

  const companyLinks: FooterLink[] = [
    {
      label: "About Us",
      href: "https://sukrshinfotech.com/Farmermobalization/",
    },
    {
      label: "Contact Us",
      href: "https://sukrshinfotech.com/Contact/",
    },
  ];

  return (
    <section className="overflow-hidden">
      <TopNavbar />
      {/* Hero Section */}
      <div className="relative w-full bg-green-600 h-[450px] sm:h-[300px] md:h-[750px] overflow-hidden rounded-b-2xl">
        <Image
          src="/image.png"
          alt="Right Side Image"
          width={770}
          height={770}
          className="absolute right-0 bottom-0 pt-10 object-contain w-[70%] sm:w-[65%] md:w-[60%] lg:hidden"
          style={{
            maxWidth: "100%",
            height: "auto"
          }} />

        {/* Show on large screens and above */}
        <Image
          src="/image 3.png"
          alt="Right Side Image"
          width={770}
          height={770}
          className="hidden lg:block absolute right-15 scale-[1.05] bottom-0 pt-10 object-contain w-[100%] sm:w-[100%] md:w-[100%] lg:w-[100%] xl:w-[100%] 2xl:w-[90%]"
          style={{
            maxWidth: "100%",
            height: "auto"
          }} />
      </div>
      {/* Hero Text */}
      <div className="absolute px-4 left-0 sm:left-6 md:left-10 lg:left-20 top-[20%] sm:top-[35%] md:top-[30%] lg:top-[50%] -translate-y-1/2 text-white w-full sm:w-[90%] md:max-w-[60%]">
        <h1 className="text-5xl sm:text-5xl md:text-8xl lg:text-8xl xl:text-8xl font-extrabold mb-4 leading-tight">
          Kisaan Setu
        </h1>
        <p className="text-md sm:text-lg md:text-2xl lg:text-3xl pt-3 sm:pt-6 md:pt-8  leading-relaxed">
          Your Comprehensive Digital Bridge for FPO Empowerment,
          <br />
          Efficiency, and Growth.
        </p>
      </div>
      {/* About Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-5xl font-bold text-gray-800 mb-6">
            About Kisaan Setu
          </h2>
          <p className="text-gray-600 mb-6 text-base sm:text-xl">
            Farmer Producer Organizations (FPOs) stand as vital pillars in
            strengthening the agricultural community, but managing their diverse
            and complex operations presents unique challenges...
          </p>
          <p className="text-gray-600 mb-6 text-base sm:text-xl">
            Introducing Kisaan Setu meaning &#39;Farmer&#39;s Bridge&#39; more than just
            software, it&#39;s a dedicated, comprehensive platform meticulously
            designed to bridge these operational gaps.
          </p>
        </div>
      </section>
      {/* Services Section */}
      <section className="bg-gray-50 py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 text-center">
            Unlock the Full Potential of Your FPO with Kisaan Setu&#39;s Integrated
            Modules:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = [Shield, TrendingUp, Wallet, Receipt, Link2, BarChart2,][index];
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md hover:translate-y-[-5px] transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    {Icon && <Icon className="h-6 w-6 text-green-600 mr-3" />}
                    <h3 className="text-lg sm:text-2xl font-semibold text-gray-800">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm sm:text-lg">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {/* Testimonial Section for later stages (bhai ne bola krne ka toh krne ka) */}
      {/* <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 text-center">
            What Our Clients Say
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8">
            <p className="text-gray-600 italic mb-6 text-base sm:text-lg">
              "Working with GrowWise has transformed our family farm. Their
              sustainable farming practices have not only increased our yields
              but also improved our soil health dramatically..."
            </p>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg mr-4">
                JD
              </div>
              <div>
                <p className="font-medium text-gray-800">John Deere</p>
                <p className="text-sm text-gray-500">Heartland Farms, Iowa</p>
              </div>
            </div>
          </div>
        </div>
      </section> */}
      {/* Info Block */}
      {/* Footer */}
      <footer>
        <div className="bg-green-600 py-10 px-4 text-white">
          <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-6">
                <Image
                  src="/Logo.jpeg"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="rounded-2xl"
                  style={{
                    maxWidth: "100%",
                    height: "auto"
                  }} />
                <span className="text-2xl font-bold">Kisaan Setu</span>
              </Link>
              <p className="text-md">
                Build a transparent, efficient, and prosperous future for your
                farmer members. Let Kisaan Setu be the essential digital bridge
                connecting your FPOs efforts to tangible success.
              </p>
            </div>

            <div>
              <h2 className="text-2xl inline-block border-b-4 border-[#388E3C] pb-2 mb-4">
                Company
              </h2>
              <ul className="space-y-2 text-sm">
                {companyLinks.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gray-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl inline-block border-b-4 border-[#388E3C] pb-2 mb-4">
                Sukrsh
              </h2>
              <p className="text-md">
                Sukrsh Infotech Private Limited is a consultancy firm
                specializing in agriculture, water, and sanitation projects,
                partnering with government and non-government organizations to
                drive sustainable rural development.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#388E3C] py-4 text-white  text-sm px-4 flex justify-between items-center">
          <p className="aboultue">© 2025 Sukrsh. All Rights Reserved.</p>
          <p className="aboultue">Sukrsh Infotech Pvt. Ltd.</p>
        </div>
      </footer>
    </section>
  );
};

export default Home;
