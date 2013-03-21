#!/usr/bin/env ruby
require 'webrick'
include WEBrick

dir = Dir::pwd
# port = 12000 + (dir.hash % 1000)
port = 8000

puts "URL: http://#{Socket.gethostname}:#{port}"

s = HTTPServer.new(
  :Port            => port,
  :DocumentRoot    => dir
)
iframe_server = HTTPServer.new(
  :Port            => port + 1,
  :DocumentRoot    => dir
)

trap("INT") do
  s.shutdown
  iframe_server.shutdown
end

fork do
  iframe_server.start
end

s.start
