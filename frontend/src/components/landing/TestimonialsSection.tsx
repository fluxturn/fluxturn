import { motion } from "framer-motion";
import { Quote, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  image: string;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  activeTestimonial: number;
  setActiveTestimonial: (value: number | ((prev: number) => number)) => void;
}

export function TestimonialsSection({ testimonials, activeTestimonial, setActiveTestimonial }: TestimonialsSectionProps) {
  const { t } = useTranslation();
  return (
    <section className="relative py-20 md:py-32 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-2">TESTIMONIALS</h3>
          <div className="w-16 h-1 bg-cyan-600 mx-auto"></div>
        </motion.div>

        {/* Testimonial Content - Split Layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Side - Heading */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t('landing.testimonialsSection.dont', "DON'T")}<br />
              {t('landing.testimonialsSection.takeOur', "TAKE OUR")}<br />
              {t('landing.testimonialsSection.word', "WORD")}.
            </h2>
            <p className="text-xl text-gray-600 uppercase tracking-wide">{t('landing.testimonialsSection.takeTheirs', "TAKE THEIRS...")}</p>
          </motion.div>

          {/* Right Side - Testimonial Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Testimonial Card */}
            <div className="bg-white rounded-2xl shadow-xl p-10 md:p-12 relative">
              {/* Opening Quote */}
              <div className="absolute top-8 left-8">
                <Quote className="w-16 h-16 text-gray-300 opacity-50" />
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 text-lg md:text-xl leading-relaxed mb-8 relative z-10 px-4">
                {testimonials[activeTestimonial].content}
              </p>

              {/* Closing Quote */}
              <div className="absolute bottom-24 right-8">
                <Quote className="w-16 h-16 text-gray-300 opacity-50 rotate-180" />
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {testimonials[activeTestimonial].image}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">
                    {testimonials[activeTestimonial].name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonials[activeTestimonial].role}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="w-12 h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center justify-center transition-colors"
                aria-label="Previous testimonial"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="w-12 h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center justify-center transition-colors"
                aria-label="Next testimonial"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
