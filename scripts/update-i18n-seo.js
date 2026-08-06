const fs = require('fs');

['vi', 'en', 'zh'].forEach(lang => {
  const path = `src/i18n/translations/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  // Clean up nested objects from previous mistake
  delete data.settingsTab;
  delete data.seoConfig;

  if (lang === 'vi') {
    data['settingsTab.seo'] = "Cấu hình SEO";
    data['seoConfig.title'] = "Cấu hình SEO";
    data['seoConfig.desc'] = "Thiết lập thông tin thẻ Meta cơ bản cho các trang của hệ thống.";
    data['seoConfig.webInfo'] = "Thông tin Website";
    data['seoConfig.webInfoDesc'] = "Cấu hình Title, Description và Keywords";
    data['seoConfig.systemName'] = "Tên Hệ Thống (Title)";
    data['seoConfig.description'] = "Mô tả (Description)";
    data['seoConfig.keywords'] = "Từ khóa (Keywords)";
    data['seoConfig.logoInfo'] = "Logo Website";
    data['seoConfig.logoDesc'] = "Upload ảnh để làm icon (favicon) hoặc hiển thị meta image";
    data['seoConfig.currentPath'] = "Đường dẫn hiện tại";
    data['seoConfig.logoHint'] = "Hỗ trợ các định dạng .png, .jpg, .svg. Kích thước khuyến nghị: 512x512";
    data['seoConfig.saveBtn'] = "Lưu cấu hình";
    data['seoConfig.saveSuccess'] = "Đã lưu cấu hình SEO. Vui lòng F5 trang ngoài để kiểm tra.";
    data['seoConfig.saveError'] = "Lỗi khi lưu cấu hình";
    data['seoConfig.uploadSuccess'] = "Tải logo lên thành công";
    data['seoConfig.uploadError'] = "Lỗi upload ảnh";
    data['seoConfig.changeImage'] = "Đổi ảnh";
  } else if (lang === 'en') {
    data['settingsTab.seo'] = "SEO Config";
    data['seoConfig.title'] = "SEO Configuration";
    data['seoConfig.desc'] = "Set up basic Meta tags for the system's pages.";
    data['seoConfig.webInfo'] = "Website Information";
    data['seoConfig.webInfoDesc'] = "Configure Title, Description, and Keywords";
    data['seoConfig.systemName'] = "System Name (Title)";
    data['seoConfig.description'] = "Description";
    data['seoConfig.keywords'] = "Keywords";
    data['seoConfig.logoInfo'] = "Website Logo";
    data['seoConfig.logoDesc'] = "Upload an image to use as favicon or meta image";
    data['seoConfig.currentPath'] = "Current Path";
    data['seoConfig.logoHint'] = "Supports .png, .jpg, .svg. Recommended size: 512x512";
    data['seoConfig.saveBtn'] = "Save Config";
    data['seoConfig.saveSuccess'] = "SEO settings saved. Please refresh the page to see changes.";
    data['seoConfig.saveError'] = "Error saving config";
    data['seoConfig.uploadSuccess'] = "Logo uploaded successfully";
    data['seoConfig.uploadError'] = "Error uploading image";
    data['seoConfig.changeImage'] = "Change image";
  } else {
    data['settingsTab.seo'] = "SEO 设置";
    data['seoConfig.title'] = "SEO 配置";
    data['seoConfig.desc'] = "设置系统的基本 Meta 标签。";
    data['seoConfig.webInfo'] = "网站信息";
    data['seoConfig.webInfoDesc'] = "配置标题、描述和关键字";
    data['seoConfig.systemName'] = "系统名称 (Title)";
    data['seoConfig.description'] = "描述 (Description)";
    data['seoConfig.keywords'] = "关键字 (Keywords)";
    data['seoConfig.logoInfo'] = "网站 Logo";
    data['seoConfig.logoDesc'] = "上传图片用作网站图标或 meta 图像";
    data['seoConfig.currentPath'] = "当前路径";
    data['seoConfig.logoHint'] = "支持 .png、.jpg、.svg。推荐大小：512x512";
    data['seoConfig.saveBtn'] = "保存配置";
    data['seoConfig.saveSuccess'] = "SEO 设置已保存。请刷新页面以查看更改。";
    data['seoConfig.saveError'] = "保存配置时出错";
    data['seoConfig.uploadSuccess'] = "Logo 上传成功";
    data['seoConfig.uploadError'] = "上传图片时出错";
    data['seoConfig.changeImage'] = "更改图像";
  }
  
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
});
