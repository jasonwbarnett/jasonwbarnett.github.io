---
title: How to remove all files from a Rackspace Cloud Files container
author: Jason Barnett
layout: post
categories:
  - Cloud
  - Rackspace
  - Ruby
---
I recently switched from [Rackspace Cloud Files][1] to [Amazon’s S3][2] due to the high number of read errors I was getting while using Cloud Files. This presented an interested challenge: How am I going to remove all of these containers that are filled with thousands of files? I searched high and low and couldn’t find any code that could automate the entire process. This led me to hunt for a Ruby Library and get to coding! I quickly stumbled upon [fog][3] and began to code. Below is a very quick and dirty script to get the job done. I’m hoping that you’ll be able to modify the script below in a few minutes and you’ll be able to easily remove all files from several hundred containers, if not more. The script even has a neat little counter so you know where you are in the whole process.

{% highlight ruby %}
#!/usr/bin/env ruby
# Author: Jason Barnett <J@sonBarnett.com>

require 'fog'

def delete_file(container, file_num, max_tries)
  max_retries ||= max_tries
  try = 0
  puts "(#{file_num} of #{container.files.count}) Removing #{container.files[file_num].key}"
  begin
    container.files[file_num].destroy
  rescue Excon::Errors::NotFound, Excon::Errors::Timeout, Fog::Storage::Rackspace::NotFound => e
    if try == max_retries
      $stderr.puts e.message
    else
      try += 1
      puts "Retry \##{try}"
      retry
    end
  end
end

def equal_div(first, last, num_of_groups)
  total      = last - first
  group_size = total / num_of_groups + 1

  top    = first
  bottom = top + group_size
  blocks = 1.upto(num_of_groups).inject([]) do |result, x|
    bottom = last if bottom > last
    result << [ top, bottom ]

    top    += group_size + 1
    bottom =  top + group_size

    result
  end

  blocks
end

service = Fog::Storage.new({
    :provider             => 'Rackspace',               # Rackspace Fog provider
    :rackspace_username   => 'your_rackspace_username', # Your Rackspace Username
    :rackspace_api_key    => 'your_api_key',            # Your Rackspace API key
    :rackspace_region     => :ord,                      # Defaults to :dfw
    :connection_options   => {},                        # Optional
    :rackspace_servicenet => false                      # Optional, only use if you're the Rackspace Region Data Center
})

containers = service.directories.select do |s|
  s.key =~ /^some_regex/  # Only delete containers that match the regexp
end

TOT_THREADS = 4
threads     = []

containers.each do |container|
  puts
  puts "-----------------------------------------"
  puts "-- Removing _ALL_ objects from #{container.key}"
  puts "-----------------------------------------"
  puts

  #puts "container.files.count: #{container.files.count}"

  ## separates the number of files into equal groups to distribute to each thread
  mygroups = equal_div(0, container.files.count - 1, TOT_THREADS)

  0.upto(TOT_THREADS - 1) do |thread|
    threads << Thread.new([ container, mygroups[thread] ]) { |tObject|
      tObject[1][0].upto(tObject[1][1]) do |x|
        delete_file(tObject[0], x, 5)
      end
    }

  end
  threads.each { |aThread|  aThread.join }
  puts "Deleting #{container.key}"
  container.destroy
end
{% endhighlight %}

[1]: http://www.rackspace.com/cloud/files/
[2]: http://aws.amazon.com/s3/
[3]: https://github.com/fog/fog