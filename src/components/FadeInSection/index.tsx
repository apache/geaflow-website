
import { MotionProps, motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import React from 'react';

interface IFadeInSectionProps extends MotionProps {
    children: React.ReactNode;
    threshold?: number;
}
const FadeInSection: React.FC<IFadeInSectionProps> = (props) => {
    const { children, threshold = 0.8, ...otherProps } = props;
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold,
    });

    return <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }} // 初始化透明度为0和向下偏移50px
        animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 50 }} // 可见时透明度变为1和偏移量变为0
        transition={{ duration: 1 }} // 动画持续时间为0.5秒
        {...otherProps}
    >
        {children}
    </motion.div>
};

export default FadeInSection;
