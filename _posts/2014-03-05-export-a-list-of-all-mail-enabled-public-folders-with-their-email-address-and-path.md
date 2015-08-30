---
layout: post
title: "Export a list of all mail enabled public folders with their email address and path"
author: Jason Barnett
category: posts
categories:
  - Windows
  - Exchange
  - Powershell
---

First let me start off by saying, this is not a post to show off my powershell skills because let me tell you, they suck and I have no desire to improve them.

I ran into a slight problem at work this past month. We needed to provide a list of all of our Mail-Enabled Public Folder's email address and location in order
that we could migrate them to Google Groups/Users. As I searched the internet, I quickly found that this wasn't an "easy" task in Exchange. I was in complete
and utter shock that Exchange didn't have some quick way of doing this. The only built in options I could find where to either get all Public Folders
(`Get-PublicFolder`) with their locations or to get all Mail-Enabled Folders (`Get-MailPublicFolder`) with their email address and no location. This of course is
problematic when you need all Public Folder's email address + location.

I ended up combining a few powershell techniques I found across the internet to get the desired result. This little and simple powershell script will save a CSV with
all of the Mail-Enabled Public Folders email address and location.

{% highlight PowerShell %}

## export-mail-enabled-public-folders.ps1 ##
############################################

$resultsarray = @()

$mailpub = Get-MailPublicFolder -ResultSize unlimited
foreach ($folder in $mailpub) {
  $email      = $folder.primarysmtpaddress.local + "@" + $folder.primarysmtpaddress.domain
  $pubfolder  = Get-PublicFolder -Identity $folder.identity
  $folderpath = $pubfolder.parentpath + "\" + $pubfolder.name

  # Create a new object for the purpose of exporting as a CSV
  $pubObject = new-object PSObject
  $pubObject | add-member -membertype NoteProperty -name "Email" -Value $email
  $pubObject | add-member -membertype NoteProperty -name "FolderPath" -Value $folderpath


  # Append this iteration of our for loop to our results array.
  $resultsarray += $pubObject
}

# Finally we want export our results to a CSV:
$resultsarray | export-csv -Path $env:userprofile\Desktop\mail-enabled-public-folders.csv

{% endhighlight %}


Below is some example output:

```
#TYPE System.Management.Automation.PSCustomObject
"Email","FolderPath"
"GS_request@company.com","\Company US\Global Systems\GS_request"
"HR@company.com","\Company US\HR"
"IT2@company.com","\Company US\IT"
"Purchases@company.com","\Company US\IT\Purchases"
"Japan@company.com","\Company US\Japan"
"JPN-Sales@company.com","\Company US\Japan\JPN-Sales"
"Marketing@company.com","\Company US\Marketing"
"Webmaster@company.com","\Company US\Marketing\Webmaster"
"BlogFeedback@company.com","\Company US\Marketing\Webmaster\Blog Feedback"
"DomainRegistration@company.com","\Company US\Marketing\Webmaster\Domain Registration"
"Feedblitzsignups@company.com","\Company US\Marketing\Webmaster\Feedblitz signups"
"SampleMaps@company.com","\Company US\Marketing\Webmaster\Sample Maps"
"MarketingCalendar3@company.com","\Company US\Marketing Calendar"
"Product@company.com","\Company US\Product"
"Archive@company.com","\Company US\Product\Archive"
"R&D@company.com","\Company US\R&D"
"Muse@company.com","\Company US\R&D\Muse"
"Bugs@company.com","\Company US\R&D\Muse\Bugs"
"Handleditems@company.com","\Company US\R&D\Muse\Handled items"
"resellerorder@company.com","\Company US\Sales Ops\resellerorder"
"ResellerOrdersCompleted@company.com","\Company US\Sales Ops\resellerorder\Reseller Orders Completed"
"TimeOffSchedule@company.com","\Company US\Sales Ops\resellerorder\Time Off Schedule"
"SalesCalendar@company.com","\Company US\Sales\Sales Calendar"
```

