#!/usr/bin/perl

print "file\tintrowords\tintrochars\tappcritwords\tappcritchars\tindexwords\tindexchars\ttextwords\ttextchars\n";
foreach $tmps (@ARGV) {
	dostats($tmps);
}
print "totals\t$totintrowords\t$totintrochars\t$totappcritwords\t$totappcritchars\t$totindexwords\t$totindexchars\t$tottextwords\t$tottextchars\n";

sub dostats {
	$curfile = @_[0];
 
$introwords = $introchars = $appcritwords = $appcritchars = $indexwords = $indexchars = $textwords = $textchars = 0;


open INF, "< $curfile";
while(<INF>) {
	

s#^\s+##g;
s#\s*$##g;
	if(/<pb\s+n="([^"]+)/ ) {
		$curpage = $1;
		$inappcrit = 0;
		next;
	}

	if(/<pb\s+xml:id="v\.[0-9]+\.p\.([^"]+)/ ) {
		$curpage = $1;
		$inappcrit = 0;
		next;
	}


	if( $curfile =~ /PL/ and /<\/note>/ ) {
		$inappcrit = 0;
	}

	if( /subtype="([^"]+)/ ) {
		$cursub = $1;
	}

	if($cursub =~ /index/i ) {
		$indexwords += s#(\s+)#$1#g;
		$indexchars += length;
		next;
	}
	
	if( $curpage =~ /[IXVLC]+/i ) {
		$introwords += s#(\s+)#$1#g;
		$introchars += length;
		next;
	}

	if($inappcrit ) {
		@w = split;
		if( $#w > 0) {
			$appcritwords += s#(\s+)#$1#g;
			$appcritchars += length;
		}
		next;
	}

	if( /(<note type="foot.+)/ ) {
		my $curnote = $1;
		
		@w = split(/\s+/, $curnote);
		if( $#w > 0) {
		$appcritchars += length $curnote;
		$appcritwords += $#w;
		}
		$inappcrit ++;


		@w = split;
		
		if( $#w > 0) {
			$textwords += $#w;
			$textchars += length ($_);
		}
		
		next;
	}
	
	$textwords += s#(\s+)#$1#g;
	$textchars += length;

}
close INF;

$totintrowords += $introwords;
$totintrochars += $introchars;

$totappcritwords += $appcritwords;
$totappcritchars += $appcritchars;

$totindexwords += $indexwords;
$totindexchars += $indexchars;

$tottextwords += $textwords;
$tottextchars += $textchars;

print "$curfile\t$introwords\t$introchars\t$appcritwords\t$appcritchars\t$indexwords\t$indexchars\t$textwords\t$textchars\n";
}
