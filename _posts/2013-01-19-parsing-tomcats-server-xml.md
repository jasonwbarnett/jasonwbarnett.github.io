---
title: "Parsing Tomcat's server.xml using Ruby"
layout: "post"
categories:
  - Linux
  - Ruby
  - Tomcat
---
I needed a tool to create a flat file database from Tomcat's server.xml that I could then later reference when migrating sites, when creating a snapshot, etc. This is what I came up with:

{% highlight ruby %}
#!/usr/bin/ruby

require 'rubygems'
require 'optparse'
require 'nokogiri'

options = {}
optparse = OptionParser.new do |opts|
  opts.banner = "Usage: #{File.basename($0)} [options]"

  opts.on("-d", "--debug",
    "Enables some helpful debugging output."
  ) { |value| options[:debug] = true }

  opts.on("-f", "--file FILE",
    "The server.xml file you would like to load."
  ) { |value| options[:file] = value }

  opts.on("-o", "--old",
    "Generate using the old formatting."
  ) { |value| options[:old] = value }

  opts.on("-h", "--help", "Display this help message.") do
    puts opts
    exit
  end
end

begin
  optparse.parse!
rescue OptionParser::MissingArgument
  puts "You're missing an argument...\n\n"
  puts optparse
  exit
end

p options if options[:debug] == true
p ARGV    if options[:debug] == true

## MAIN PROGRAM: ##
###################
file_to_parse = options[:file] ? options[:file] : "/opt/tomcat/conf/server.xml"

if ! FileTest.exist? file_to_parse
  $stderr.puts "#{file_to_parse} doesn't exist."
  $stderr.puts "   maybe you should use the -f option?\n\n"
  $stderr.puts optparse
  exit
elsif ! FileTest.readable? file_to_parse
  $stderr.puts "#{file_to_parse} isn't readable, exiting..."
  exit
end
puts "Parsing: " + file_to_parse if options[:debug] == true

## Create a table so we can lookup the line number for the </Service> for the particular service we want
lines = File.open(file_to_parse).readlines.collect { |x| x.strip }
lines.unshift('placing item in array so the index reflects the actual line number')

services_start = (0 .. lines.count - 1).find_all { |x| lines[x,1].to_s.match(/<Service/) }
services_end   = (0 .. lines.count - 1).find_all { |x| lines[x,1].to_s.match(/<\/Service/) }
service_line_numbers = services_start.zip(services_end)
p service_line_numbers if options[:debug] == true

end_line_lookup = service_line_numbers.inject({}) do |result, element|
  key   = element.first
  value = element.last
  result[key] = value
  result
end

xml_doc = Nokogiri::XML(File.open(file_to_parse))

xml_doc.xpath('//Service').each do |service|
  name = service[:name]
  start_line = service.line
  end_line   = end_line_lookup[start_line]

  # Create an array with all connectors and the needed attributes in a hash
  connectors = []
  service.children.css('Connector').each do |connector|
    connectors << {:ip => connector[:address], :port => connector[:port]}
  end

  # Create an array with all docBases
  docBase = []
  service.children.css('Context').each do |context|
    docBase << context[:docBase]
  end

  resources = []
  service.children.css('Resource').each do |resource|
    db_host     = resource[:url].scan(%r{mysql://(.*)/}).join.sub(/^127\.0\.0\.1$/, "localhost")
    schema_name = resource[:url].scan(%r{/([^/]+)\?}).join

    if resources.empty?
      resources << {:db_host => db_host, :schema_name => schema_name}
    else
      duplicate=""
      resources.each do |i|
        if i[:db_host] == db_host and i[:schema_name] == schema_name
          duplicate=true
        end
      end
      if duplicate != true
        resources << {:db_host => db_host, :schema_name => schema_name}
      end
    end
  end

  if options[:old] == true
    # Create schemas array for all schema names, then add NAMEuser schema.
    schemas = resources.inject([]) do |result, resource|
      result << resource[:schema_name]
      result
    end

    # Create dbhost variable and check some stuff out
    db_hosts = resources.inject([]) do |result, resource|
      result << resource[:db_host]
      result
    end.uniq
    if db_hosts.count > 1
      puts "WARNING: We found miltiple hosts for the schema's, exiting..."
      p db_hosts if options[:debug] == true
      exit 1
    end

    schemas << "#{schemas[0]}user"
    # Create ips array for all ip addresses
    ips = connectors.inject([]) do |result, connector|
      result << connector[:ip]
      result
    end
    puts "#{start_line},#{end_line}:#{ips.uniq.join(',')}:#{docBase.uniq.join(',')}:#{db_hosts.join(',')}:#{schemas.join(',')}:#{name}"
  else
    serviceDefintion = {:start_line => start_line, :end_line => end_line, :name => name, :connectors => connectors.uniq, :docBases => docBase.uniq, :resources => resources}
    p serviceDefintion
  end
end
{% endhighlight %}
