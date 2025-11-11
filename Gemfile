source "https://rubygems.org"

# Jekyll 版本（GitHub Pages 兼容）
gem "jekyll", "~> 3.9.3"

# GitHub Pages gem（包含所有 GitHub Pages 支持的插件）
gem "github-pages", group: :jekyll_plugins

# Jekyll 插件
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-paginate"
end

# Windows 和 JRuby 不包含 zoneinfo 文件，需要 tzinfo-data gem
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

