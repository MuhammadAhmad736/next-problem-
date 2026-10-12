import Navbar from "@/components/HomePage/Navbar";
import Hero from "@/components/HomePage/Hero";
import Howitworks from "@/components/HomePage/Howitworks";
import Features from "@/components/HomePage/features";
import Testimonials from "@/components/HomePage/testimonials";
import AboutVideoGrab from "@/components/HomePage/about";
import Footer from "@/components/HomePage/footer";
import ScrollReveal from "@/components/HomePage/ScrollReveal";

const page = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <ScrollReveal>
        <Howitworks />
      </ScrollReveal>
      <ScrollReveal>
        <Features />
      </ScrollReveal>
      <ScrollReveal>
        <Testimonials />
      </ScrollReveal>
      <div className="h-px w-full bg-background" aria-hidden="true" />
      <ScrollReveal>
        <AboutVideoGrab />
      </ScrollReveal>
      <div className="h-px w-full bg-background" aria-hidden="true" />
      <ScrollReveal>
        <Footer />
      </ScrollReveal>
    </>
  );
};

export default page;
