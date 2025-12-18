import React, { useState } from "react";
import { FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What services does this program offer?",
      answer:
        "The program provides assistance, guidance, and resources to support applicants through the evaluation and documentation process."
    },
    {
      question: "Who can apply for this program?",
      answer:
        "Any working professional or individual with relevant experience who meets the eligibility requirements can apply."
    },
    {
      question: "How long does the application process take?",
      answer:
        "Processing times vary depending on document completeness, applicant responsiveness, and evaluation schedules."
    },
    {
      question: "Are incomplete requirements acceptable?",
      answer:
        "Applicants may submit initial documents, but full requirements must be met before final evaluation."
    },
    {
      question: "Is there someone I can contact for help?",
      answer:
        "Yes. You may reach out to the program coordinator or support representative for assistance anytime."
    }
  ];

  const filteredFAQs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-center text-gray-600 mb-10">
          Find answers to common questions below.
        </p>

        {/* Search Bar */}
        <div className="flex items-center bg-white shadow-md rounded-full px-5 py-3 mb-8">
          <FiSearch className="text-gray-500 text-xl mr-3" />
          <input
            type="text"
            placeholder="Search a question..."
            className="w-full outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <div
                key={index}
                className="bg-white shadow-md rounded-xl p-5 cursor-pointer transition-all"
                onClick={() => toggleFAQ(index)}
              >
                {/* Question Row */}
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {faq.question}
                  </h2>
                  {openIndex === index ? (
                    <FiChevronUp className="text-gray-600 text-2xl" />
                  ) : (
                    <FiChevronDown className="text-gray-600 text-2xl" />
                  )}
                </div>

                {/* Answer */}
                <div
                  className={`mt-2 text-gray-600 overflow-hidden transition-all duration-300 ${
                    openIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="mt-3 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-10">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
