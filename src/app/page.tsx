import { ImageCarousel } from '@/components/ImageCarousel'
import TopNavbar from '@/components/topNavbar'
import React, { JSX } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Type definitions
interface FeatureItem {
  title: string;
  description: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface SocialLink {
  name: string;
  href: string;
  icon: JSX.Element;
}

const Home: React.FC = ():JSX.Element => {
  // Feature items data
  const features: FeatureItem[] = [
    {
      title: "Enhance Transparency & Accountability:",
      description: "Foster trust among members and stakeholders with clear, accessible data."
    },
    {
      title: "Drive Profitability:",
      description: "Optimize operations from input procurement to final sale, maximizing returns for members"
    },
    {
      title: "Financial Management:",
      description: "Simplify your FPO's financial management with easy-to-use tools for tracking payments, receivables, expenses, and member share capital."
    },
    {
      title: "Transaction Management:",
      description: "Manage transactions transparently, generate accurate financial statements (like Balance Sheets, P&L), and gain a clear understanding of your organization's financial health."
    },
    {
      title: "Market Connections:",
      description: "Facilitate better connections between your FPO's output and potential buyers, unlocking improved market opportunities and prices."
    }
  ];

  // Footer links data
  const companyLinks: FooterLink[] = [
    {
      label: "About Us",
      href: "https://sukrshinfotech.com/Farmermobalization/"
    },
    {
      label: "Contact Us",
      href: "https://sukrshinfotech.com/Contact/"
    }
  ];

  return (
    <section>
      <TopNavbar />
      <ImageCarousel />

      <div className='mx-4 p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'>
        <h1 className='mb-4 text-4xl text-center font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white'>
          Kisaan Setu
        </h1>
        
        <h2 className='text-2xl md:text-4xl font-extrabold dark:text-white'>
          Your Comprehensive Digital Bridge for FPO Empowerment, Efficiency, and Growth
        </h2>

        <p className='my-4 text-lg text-gray-500'>
          Farmer Producer Organizations (FPOs) stand as vital pillars in strengthening the agricultural community, but managing their diverse and complex operations presents unique challenges. From coordinating hundreds of members and tracking countless transactions to optimizing resource allocation and connecting with markets, the need for a robust, integrated system is paramount.
        </p>
        
        <p className="my-4 text-lg text-gray-500">
          Introducing Kisaan Setu meaning &apos;Farmer&apos;s Bridge&apos; more than just software, it&apos;s a dedicated, comprehensive platform meticulously designed to bridge these operational gaps.
        </p>

        <h2 className="text-xl font-bold mb-4">
          Unlock the Full Potential of Your FPO with Kisaan Setu&apos;s Integrated Modules:
        </h2>
        
        <ul className='list-disc list-inside space-y-2'>
          {features.map((feature, index) => (
            <li key={index}>
              <span className='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
                {feature.title}
              </span>
              {" "}
              {feature.description}
            </li>
          ))}
        </ul>
      </div>
  
      <footer>
        <div className="bg-purple-950 py-4 text-gray-400">
          <div className="container px-4 mx-auto">
            <div className="-mx-4 flex flex-wrap justify-between">
              <div className="px-4 my-4 w-full xl:w-1/5">
                <Link href="/" className="flex items-center gap-2 mb-10">
                  <Image 
                    src="/Logo.jpeg" 
                    alt="Kisaan Setu Logo" 
                    width={64}
                    height={64}
                    className="rounded-2xl"
                  />
                  <span className="text-3xl font-bold">Kisaan Setu</span>
                </Link>
                <p className="text-justify">
                  Build a transparent, efficient, and prosperous future for your farmer members. Let Kisaan Setu be the essential digital bridge connecting your FPOs efforts to tangible success.
                </p>
              </div>

              <div className="px-4 my-4 w-full sm:w-auto">
                <div>
                  <h2 className="inline-block text-2xl pb-4 mb-4 border-b-4 border-blue-600">
                    Company
                  </h2>
                </div>
                <ul className="leading-8">
                  {companyLinks.map((link, index) => (
                    <li key={index}>
                      <a 
                        href={link.href} 
                        className="hover:text-blue-400 transition-colors duration-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-4 my-4 w-full sm:w-auto">
                <div>
                  <h2 className="inline-block text-2xl pb-4 mb-4 border-b-4 border-blue-600">
                    Sukrsh
                  </h2>
                </div>
                <p className='w-96'>
                  Sukrsh Infotech Private Limited is a consultancy firm specializing in agriculture, water, and sanitation projects, partnering with government and non-government organizations to drive sustainable rural development.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-700 py-4 text-gray-100">
          <div className="container mx-auto px-4">
            <div className="-mx-4 flex flex-wrap justify-between">
              <div className="px-4 w-full text-center sm:w-auto sm:text-left">
                Copyright © 2025 Sukrsh. All Rights Reserved.
              </div>
              <div className="px-4 w-full text-center sm:w-auto sm:text-left">
                Sukrsh Infotech Pvt. Ltd.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </section>
  )
}

export default Home