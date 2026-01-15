"use client";

interface BannerProps {
  imageUrl?: string;
  alt?: string;
}

export default function Banner({ imageUrl, alt = "G-Bird 배너" }: BannerProps) {
  // 추후 이미지 제공 시 imageUrl 사용, 현재는 placeholder
  const bannerStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      };

  return (
    <div
      className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden"
      style={bannerStyle}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">G-Bird</h1>
            <p className="text-lg md:text-xl opacity-90">배드민턴 클럽 운영 플랫폼</p>
          </div>
        </div>
      )}
    </div>
  );
}
