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
iframe_source_server = HTTPServer.new(
  :Port            => port + 1,
  :DocumentRoot    => dir
)

iframe_destination_server = HTTPServer.new(
  :Port            => port + 2,
  :DocumentRoot    => dir
)

trap("INT") do
  s.shutdown
  iframe_source_server.shutdown
  iframe_destination_server.shutdown
end

fork do
  iframe_source_server.start
end

fork do
  iframe_destination_server.start
end

s.start
